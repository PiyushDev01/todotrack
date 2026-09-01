import React, { useState, useEffect, useCallback } from 'react';
import codingPenguin from '../penguin images/coding.png';
import neutralPenguin from '../penguin images/neutral.png';
import angryPenguin from '../penguin images/angry.png';
import sadPenguin from '../penguin images/sad.png';
import cryPenguin from '../penguin images/cry.png';
import moreAngryPenguin from '../penguin images/more angry.png';
import lovePenguin from '../penguin images/love.png';
import chillingPenguin from '../penguin images/chilling.png';
import sleepingWithStreakPenguin from '../penguin images/sleepingWithStreakPenguin.png';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import LeetCodeStreakBar from './LeetCodeStreakBar';
import StreakCard from './StreakCard';

interface LeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  totalTotal: number; // Sum of totalEasy, totalMedium, totalHard from API
  ranking: number;
  contributionPoint: number;
  reputation: number;
  submissionCalendar: { [key: string]: number };
}

const LEETCODE_USERNAME_KEY = 'leetcodeUsername';
const DSA_SHEET_URL_KEY = 'dsaSheetUrl';
const LEETCODE_CACHE_PREFIX = 'leetcode_cache_';
const LEETCODE_SHOW_CONTEST_KEY = 'leetcodeShowContest';
const LEETCODE_SHOW_STUDY_PLAN_KEY = 'leetcodeShowStudyPlan';
const LEETCODE_SHOW_DAILY_KEY = 'leetcodeShowDaily';
const LEETCODE_SHOW_SHEET_KEY = 'leetcodeShowSheet';

// Helper function to determine effective date for submissions
const getEffectiveDate = (date: Date): Date => {
  const hour = date.getHours();
  if (hour < 5) {
    // If before 5 AM, count as previous day
    return addDays(date, -1);
  }
  return date;
};

const LeetCodeWidget: React.FC = () => {
  const [leetcodeUsername, setLeetcodeUsername] = useState<string>('');
  const [showInput, setShowInput] = useState<boolean>(true);
  const [stats, setStats] = useState<LeetCodeStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dsaSheetUrl, setDsaSheetUrl] = useState<string>('');
  const [showDsaSheetInput, setShowDsaSheetInput] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [currentPenguinImage, setCurrentPenguinImage] = useState<string>(neutralPenguin);
  const [streakTimeLeft, setStreakTimeLeft] = useState('');
  const [showContest, setShowContest] = useState(() => 
    localStorage.getItem(LEETCODE_SHOW_CONTEST_KEY) === 'true');
  const [showStudyPlan, setShowStudyPlan] = useState(() => 
    localStorage.getItem(LEETCODE_SHOW_STUDY_PLAN_KEY) === 'true');
  const [showDaily, setShowDaily] = useState(() => 
    localStorage.getItem(LEETCODE_SHOW_DAILY_KEY) !== 'false'); // Default to true
  const [showSheet, setShowSheet] = useState(() => 
    localStorage.getItem(LEETCODE_SHOW_SHEET_KEY) !== 'false'); // Default to true

  const PENGUIN_IMAGES = React.useMemo(() => ({
    happy: codingPenguin,
    neutral: neutralPenguin,
    angry: angryPenguin,
    sad: sadPenguin,
    cry: cryPenguin,
    'more angry': moreAngryPenguin,
    love: lovePenguin,
    chilling: chillingPenguin,
    sleepingWithStreak: sleepingWithStreakPenguin,
  }), []);

  const fetchLeetCodeStats = useCallback(async (username: string, isPeriodicCheck: boolean = false) => {
    if (!username.trim()) {
      setError('LeetCode username cannot be empty.');
      setStats(null);
      // Ensure loading is off if we're showing the input form
      setLoading(false); // Unconditionally set to false if showing input form
      setShowInput(true);
      return;
    }

    if (!isPeriodicCheck) {
      setLoading(true);
    }
    setError(null);
    
    const maxRetries = 3; 
    let retries = 0;
    let delay = 2000; 
    const maxDelay = 8000; 

    try {
      while (retries < maxRetries) {
        try {
          console.log(`Attempting to fetch LeetCode stats for user: ${username}, attempt ${retries + 1}/${maxRetries}`);
          const profileRes = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });

          if (!profileRes.ok) {
            if (profileRes.status === 404) {
              throw new Error(`User '${username}' not found on LeetCode. Please check the username.`);
            } else if (profileRes.status === 429) {
              const retryAfter = profileRes.headers.get('Retry-After');
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
              
              console.warn(`Rate limit hit (429). Retrying in ${waitTime / 1000} seconds...`);
              retries++;
              const jitter = Math.random() * 500; 
              await new Promise(resolve => setTimeout(resolve, Math.min(waitTime + jitter, maxDelay)));
              delay = Math.min(delay * 2, maxDelay);
              continue;
            } else {
              throw new Error(`Profile fetch error: ${profileRes.statusText} (Status: ${profileRes.status})`);
            }
          }

          const profile = await profileRes.json();
          console.log('Raw LeetCode Profile API Response Data:', profile);

          if (!profile || typeof profile.totalSolved === 'undefined' || profile.errors) {
              if (profile.errors && profile.errors.length > 0) {
                  throw new Error(profile.errors[0].message || 'Could not fetch LeetCode profile stats.');
              } else {
                  throw new Error('Invalid LeetCode profile data received. Username might be incorrect or API response malformed.');
              }
          }

          const totalTotalQuestions = (profile.totalEasy || 0) + (profile.totalMedium || 0) + (profile.totalHard || 0);

          const cacheData = {
            data: profile,
            timestamp: Date.now()
          };
          localStorage.setItem(`${LEETCODE_CACHE_PREFIX}${username}`, JSON.stringify(cacheData));

          setStats({
            totalSolved: profile.totalSolved,
            easySolved: profile.easySolved,
            mediumSolved: profile.mediumSolved,
            hardSolved: profile.hardSolved,
            totalEasy: profile.totalEasy || 0,
            totalMedium: profile.totalMedium || 0,
            totalHard: profile.totalHard || 0,
            totalTotal: totalTotalQuestions, 
            ranking: profile.ranking || 0,
            contributionPoint: profile.contributionPoint || 0,
            reputation: profile.reputation || 0,
            submissionCalendar: profile.submissionCalendar || {}
          });
          console.log('Stats set successfully. Total Solved:', profile.totalSolved);
          setShowInput(false);

          break; 

        } catch (err) {
          console.error(`Fetch attempt ${retries + 1}/${maxRetries} failed:`, err);
          if (retries === maxRetries) {
            const cachedData = localStorage.getItem(`${LEETCODE_CACHE_PREFIX}${username}`);
            if (cachedData) {
              try {
                const { data, timestamp } = JSON.parse(cachedData);
                const cacheAge = Date.now() - timestamp;
                if (cacheAge < 3600000) { 
                  console.log('Using cached LeetCode data due to API error.');
                  setStats({
                    totalSolved: data.totalSolved,
                    easySolved: data.easySolved,
                    mediumSolved: data.mediumSolved,
                    hardSolved: data.hardSolved,
                    totalEasy: data.totalEasy,
                    totalMedium: data.totalMedium,
                    totalHard: data.totalHard,
                    totalTotal: (data.totalEasy || 0) + (data.totalMedium || 0) + (data.totalHard || 0),
                    ranking: data.ranking || 0,
                    contributionPoint: data.contributionPoint || 0,
                    reputation: data.reputation || 0,
                    submissionCalendar: data.submissionCalendar || {}
                  });
                  setError(null);
                  setShowInput(false);
                  return; 
                }
              } catch (e) {
                console.error('Error parsing cached data:', e);
              }
            }

            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
              setError('Network Error: Could not connect to LeetCode API. Please check your internet connection, ensure no VPN/firewall is blocking the request, or the API server might be temporarily down.');
            } else if (err instanceof Error) {
              setError(`Error: ${err.message}. This might be due to an incorrect LeetCode username or an API issue.`);
            } else {
              setError('An unexpected error occurred while fetching LeetCode stats.');
            }
            setStats(null);
            setShowInput(true);
          } 
        } 
      }
    } finally {
      if (!isPeriodicCheck) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    console.log('useEffect: Component mounted, checking localStorage for username...');
    const savedUsername = localStorage.getItem(LEETCODE_USERNAME_KEY);
    if (savedUsername) {
      setLeetcodeUsername(savedUsername);
      console.log(`useEffect: Found saved username: ${savedUsername}. Attempting initial fetch.`);
      fetchLeetCodeStats(savedUsername, false); // Initial fetch, show loading
    } else {
      setShowInput(true);
      console.log('useEffect: No saved username found. Showing input form.');
    }

    const savedDsaSheetUrl = localStorage.getItem(DSA_SHEET_URL_KEY);
    if (savedDsaSheetUrl) {
      setDsaSheetUrl(savedDsaSheetUrl);
      console.log('useEffect: Loaded DSA Sheet URL from localStorage.');
    }
    
    // Load button visibility settings
    const savedShowContest = localStorage.getItem(LEETCODE_SHOW_CONTEST_KEY);
    const savedShowStudyPlan = localStorage.getItem(LEETCODE_SHOW_STUDY_PLAN_KEY);
    const savedShowDaily = localStorage.getItem(LEETCODE_SHOW_DAILY_KEY);
    const savedShowSheet = localStorage.getItem(LEETCODE_SHOW_SHEET_KEY);
    
    setShowContest(savedShowContest === 'true');
    setShowStudyPlan(savedShowStudyPlan === 'true');
    setShowDaily(savedShowDaily !== 'false'); // Default to true if not set
    setShowSheet(savedShowSheet !== 'false'); // Default to true if not set
  }, [fetchLeetCodeStats]);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (leetcodeUsername && !showInput) {
      // Re-evaluate isFirstEntry on each interval tick to dynamically adjust polling frequency
      const intervalTime = 60 * 1000;
      
      interval = setInterval(() => {
        console.log('Periodic fetch initiated.');
        fetchLeetCodeStats(leetcodeUsername, true); // Always pass true for periodic checks
      }, intervalTime);
    }
    return () => clearInterval(interval);
  }, [leetcodeUsername, showInput, fetchLeetCodeStats]);

  useEffect(() => {
  const updatePenguinMood = () => {
    const currentHour = new Date().getHours();

    const today = new Date();
    const effectiveToday = getEffectiveDate(today);
    const todayStr = format(effectiveToday, 'yyyy-MM-dd');

    // Check today's submissions directly from LeetCode API data
    const todaySolvedCountFromAPI = stats?.submissionCalendar
      ? Object.entries(stats.submissionCalendar)
          .filter(([timestamp]) =>
            format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd') === todayStr
          )
          .reduce((total, [, count]) => total + count, 0)
      : 0;

    let moodImage: string;

    // If user has submitted anything today
    if (todaySolvedCountFromAPI > 0 && stats) {

      // More than one submission → Love penguin
      if (todaySolvedCountFromAPI > 1) {
        moodImage = PENGUIN_IMAGES.love;
      }

      // One submission → Chilling during daytime
      else if (currentHour >= 5 && currentHour < 20) {
        moodImage = PENGUIN_IMAGES.chilling;
      }

      // One submission → Sleeping at night
      else {
        moodImage = PENGUIN_IMAGES.sleepingWithStreak;
      }

    } else {

      // No submission today → Time-based mood
      if (currentHour >= 5 && currentHour < 8) {
        moodImage = PENGUIN_IMAGES.neutral;
      } else if (currentHour >= 8 && currentHour < 12) {
        moodImage = PENGUIN_IMAGES.sad;
      } else if (currentHour >= 12 && currentHour < 16) {
        moodImage = PENGUIN_IMAGES.cry;
      } else if (currentHour >= 16 && currentHour < 20) {
        moodImage = PENGUIN_IMAGES.angry;
      } else {
        moodImage = PENGUIN_IMAGES['more angry'];
      }
    }

    setCurrentPenguinImage(moodImage);
  };

  updatePenguinMood();

  const intervalId = setInterval(updatePenguinMood, 60 * 1000);

  return () => clearInterval(intervalId);
}, [stats, PENGUIN_IMAGES]);


useEffect(() => {
  const updateTimer = () => {
    const now = new Date();

    const nextReset = new Date(now);

    nextReset.setHours(5, 0, 0, 0);

    // If it is already 5 AM or later,
    // the next reset is tomorrow at 5 AM.
    if (now >= nextReset) {
      nextReset.setDate(nextReset.getDate() + 1);
    }

    const difference = nextReset.getTime() - now.getTime();

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor(
      (difference % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor(
      (difference % (1000 * 60)) / 1000
    );

    setStreakTimeLeft(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  };

  updateTimer();

  const timerId = setInterval(updateTimer, 1000);

  return () => clearInterval(timerId);
}, []);


  const handleSaveUsername = () => {
  console.log(`handleSaveUsername: Attempting to save username: ${leetcodeUsername.trim()}`);

  if (leetcodeUsername.trim()) {
    const newUsername = leetcodeUsername.trim();

    localStorage.setItem(LEETCODE_USERNAME_KEY, newUsername);

    fetchLeetCodeStats(newUsername, false);

    console.log('handleSaveUsername: Username saved and fetch initiated.');
  } else {
    setError('Username cannot be empty.');
    setShowInput(true);
    console.log('handleSaveUsername: Username is empty.');
  }
};


const calculateStreak = useCallback(() => {
  if (!stats?.submissionCalendar) {
    return { count: 0, atRisk: false };
  }

  const submissionDates = new Set(
    Object.entries(stats.submissionCalendar)
      .filter(([, count]) => count > 0)
      .map(([timestamp]) =>
        format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd')
      )
  );

  const effectiveToday = getEffectiveDate(new Date());
  const todayStr = format(effectiveToday, 'yyyy-MM-dd');

  // User has already submitted today
  if (submissionDates.has(todayStr)) {
    let streak = 0;
    let currentDate = effectiveToday;

    while (submissionDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      streak++;
      currentDate = addDays(currentDate, -1);
    }

    return { count: streak, atRisk: false };
  }

  // User hasn't submitted today.
  // Check whether the previous effective day was completed.
  const yesterday = addDays(effectiveToday, -1);
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

  if (!submissionDates.has(yesterdayStr)) {
    return { count: 0, atRisk: false };
  }

  // Calculate the streak ending yesterday.
  let streak = 0;
  let currentDate = yesterday;

  while (submissionDates.has(format(currentDate, 'yyyy-MM-dd'))) {
    streak++;
    currentDate = addDays(currentDate, -1);
  }

  return { count: streak, atRisk: true };
}, [stats]);

const streakInfo = calculateStreak();

const currentStreak = streakInfo.count;
const isStreakAtRisk = streakInfo.atRisk;

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 0 });

  const getDayStatus = useCallback((dayIndex: number) => {
  const day = addDays(startOfCurrentWeek, dayIndex);
  const dayStr = format(day, 'yyyy-MM-dd');

  const submissionDates = new Set(
    Object.entries(stats?.submissionCalendar || {})
      .filter(([, count]) => count > 0)
      .map(([timestamp]) =>
        format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd')
      )
  );

  const now = new Date();
  const effectiveToday = getEffectiveDate(now);
  const effectiveTodayStr = format(effectiveToday, 'yyyy-MM-dd');

  if (submissionDates.has(dayStr)) {
    return 'completed';
  }

  if (dayStr === effectiveTodayStr) {
    return 'today-not-completed';
  }

  if (parseISO(dayStr) < effectiveToday) {
    return 'past-not-completed';
  }

  return 'not-completed';
}, [stats, startOfCurrentWeek]);

  // Count how many buttons are visible to determine when to show labels
  const visibleButtonCount = [showContest, showStudyPlan, showDaily, showSheet].filter(Boolean).length;
  const shouldShowLabels = visibleButtonCount <= 2;

  const handleDailyProblemClick = async () => {
    try {
      const response = await fetch('https://alfa-leetcode-api.onrender.com/daily');
      const data = await response.json();
      if (data && data.questionLink) {
        window.open(data.questionLink, '_blank');
      } else {
        alert('Could not fetch daily problem link.');
      }
    } catch (err) {
      console.error('Error fetching daily problem:', err);
      alert('Failed to fetch daily problem. Please try again later.');
    }
  };

  const handleDsaSheetUrlSave = () => {
    if (dsaSheetUrl.trim()) {
      localStorage.setItem(DSA_SHEET_URL_KEY, dsaSheetUrl.trim());
      setShowDsaSheetInput(false);
    }
  };
  
  const toggleButtonVisibility = (
    setting: string,
    currentValue: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const newValue = !currentValue;
    localStorage.setItem(setting, newValue.toString());
    setter(newValue);
  };

  useEffect(() => {
    localStorage.setItem(LEETCODE_SHOW_CONTEST_KEY, showContest.toString());
  }, [showContest]);

  useEffect(() => {
    localStorage.setItem(LEETCODE_SHOW_STUDY_PLAN_KEY, showStudyPlan.toString());
  }, [showStudyPlan]);

  useEffect(() => {
    localStorage.setItem(LEETCODE_SHOW_DAILY_KEY, showDaily.toString());
  }, [showDaily]);

  useEffect(() => {
    localStorage.setItem(LEETCODE_SHOW_SHEET_KEY, showSheet.toString());
  }, [showSheet]);

  // Reference to track settings menu element
  const settingsMenuRef = React.useRef<HTMLDivElement>(null);
  
  // Effect to handle clicking outside settings menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    }
    
    // Add event listener when settings menu is shown
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  if (showInput) {
    return (
      <div className="bg-zinc-800 p-6  rounded-2xl shadow-xl flex flex-col items-center justify-center h-full">
        <h3 className="text-xl font-semibold mb-6  text-white">Enter LeetCode Username</h3>
        <input
          type="text"
          value={leetcodeUsername}
          onChange={(e) => setLeetcodeUsername(e.target.value)}
          placeholder="Your LeetCode username"
          className=" border  p-2 border-gray-600 rounded-xl w-full max-w-xs mb-6 bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-[#ff3d71]"
        />
        <button
          onClick={handleSaveUsername}
          className="bg-[#c30052] hover:bg-[#d40058] text-white px-6 py-3 rounded-full font-medium transition-colors"
        >
          Save
        </button>
        {error && <p className="text-[#ff3d71] text-sm mt-4">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] p-6 rounded-2xl shadow-xl flex flex-col h-full text-center items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 mb-4 rounded-full bg-gradient-to-b from-[#333] to-[#222]"></div>
          <p className="text-lg text-white/70">Loading LeetCode stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1e1e1e] p-6 rounded-2xl shadow-xl flex flex-col h-full text-center items-center justify-center text-[#ff3d71]">
        <p className="text-lg mb-4">Error: {error}</p>
        <button
          onClick={() => {
            setShowInput(true);
          }}
          className="bg-[#c30052] hover:bg-[#d40058] text-white px-6 py-3 rounded-full font-medium transition-colors mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (stats) {
    return (
      <div className="bg-zinc-800 p-2 rounded-3xl shadow-xl flex flex-col text-white font-sans relative">
        
        
        <div className="flex flex-col md:flex-row gap-1 mb-2">
          {/* Left side - Streak Card */}
          <div className="w-[35%] h-[140px] flex-shrink-0">
            <StreakCard
              streakCount={currentStreak}
              penguinImg={currentPenguinImage}
              username={leetcodeUsername}
              isStreakAtRisk={isStreakAtRisk}
              streakTimeLeft={streakTimeLeft}
            />
          </div>

          {/* Right side - Week tracker + Stats */}
          <div className="flex-1 w-full flex flex-col gap-1">
            {/* Week Tracker */}
            <div className=" flex ">
              <LeetCodeStreakBar
                streakDays={daysOfWeek.map((_, idx) => getDayStatus(idx))}
              />
            </div>
            
            {/* Stats Section */}
            <div className="bg-[#1e1e1e] rounded-xl p-2 flex-1 flex flex-col justify-between">
              <div className="flex flex-row    justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 ">
                      <div className="w-3 h-3 rounded-full mr-2 bg-[#00d68f]"></div>
                    </div>
                    <span className="text-white/80 text-sm">{stats.easySolved}
                    <span className='opacity-60'>/{stats.totalEasy}</span></span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center gap-2 ">
                      <div className="w-3 h-3 rounded-full mr-2 bg-[#ffcc00]"></div>
                    </div>
                    <span className="text-white/80 text-sm">{stats.mediumSolved}<span className='opacity-60'>/{stats.totalMedium}</span></span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center gap-2 ">
                      <div className="w-3 h-3 rounded-full mr-2 bg-[#ff3d71]"></div>
                    </div>
                    <span className="text-white/80 text-sm">{stats.hardSolved}<span className='opacity-60'>/{stats.totalHard}</span></span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-bold">{stats.totalSolved}
                    <span className="text-white/60 font-normal text-xl">/{stats.totalTotal}</span>
                  </span>
                  <span className="text-white/80 text-xs mt-1"># {stats.ranking}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 mt-2">
          {showContest && (
            <button
              onClick={() => window.open('https://leetcode.com/contest/', '_blank')}
              className="flex-1 bg-[#3A3A3D] hover:bg-[#4A4A4D] text-white px-4 py-3 rounded-full font-medium transition-colors text-center flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>
                <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>
                <path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>
                <path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>
              </svg>
              {shouldShowLabels && <span>Contest</span>}
            </button>
          )}
          {showStudyPlan && (
            <button
              onClick={() => window.open('https://leetcode.com/studyplan/', '_blank')}
              className="flex-1 bg-[#8957e5] hover:bg-[#9768f8] text-white px-4 py-3 rounded-full font-medium transition-colors text-center flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 9c0 1.45-.43 2.78-1.17 3.89a6.985 6.985 0 0 1-4.78 3.02c-.34.06-.69.09-1.05.09-.36 0-.71-.03-1.05-.09a6.985 6.985 0 0 1-4.78-3.02A6.968 6.968 0 0 1 5 9c0-3.87 3.13-7 7-7s7 3.13 7 7Z" stroke="#d9e3f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="m21.25 18.47-1.65.39c-.37.09-.66.37-.74.74l-.35 1.47a1 1 0 0 1-1.74.41L12 16l-4.77 5.49a1 1 0 0 1-1.74-.41l-.35-1.47a.996.996 0 0 0-.74-.74l-1.65-.39a1.003 1.003 0 0 1-.48-1.68l3.9-3.9a6.985 6.985 0 0 0 4.78 3.02c.34.06.69.09 1.05.09.36 0 .71-.03 1.05-.09 1.99-.29 3.7-1.42 4.78-3.02l3.9 3.9c.55.54.28 1.49-.48 1.67ZM12.58 5.98l.59 1.18c.08.16.29.32.48.35l1.07.18c.68.11.84.61.35 1.1l-.83.83c-.14.14-.22.41-.17.61l.24 1.03c.19.81-.24 1.13-.96.7l-1-.59a.701.701 0 0 0-.66 0l-1 .59c-.72.42-1.15.11-.96-.7l.24-1.03c.04-.19-.03-.47-.17-.61l-.83-.83c-.49-.49-.33-.98.35-1.1l1.07-.18c.18-.03.39-.19.47-.35l.59-1.18c.29-.64.81-.64 1.13 0Z" stroke="#d9e3f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              {shouldShowLabels && <span>Plan</span>}
            </button>
          )}
          {showDaily && (
            <button
              onClick={handleDailyProblemClick}
              className="flex-1 bg-[#c30052] hover:bg-[#d40058] text-white px-4 py-3 rounded-full font-medium transition-colors text-center flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 2v3M16 2v3M3.5 9.09h17M22 19c0 .75-.21 1.46-.58 2.06A3.97 3.97 0 0 1 18 23c-1.01 0-1.93-.37-2.63-1-.31-.26-.58-.58-.79-.94A3.92 3.92 0 0 1 14 19c0-2.21 1.79-4 4-4 1.2 0 2.27.53 3 1.36A4 4 0 0 1 22 19Z" stroke="#d9e3f0" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="m16.44 19 .99.99 2.13-1.97" stroke="#d9e3f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 8.5v7.86c-.73-.83-1.8-1.36-3-1.36-2.21 0-4 1.79-4 4 0 .75.21 1.46.58 2.06.21.36.48.68.79.94H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="#d9e3f0" stroke-width="1.6" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.995 13.7h.01M8.294 13.7h.01M8.294 16.7h.01" stroke="#d9e3f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              {shouldShowLabels && <span>Daily</span>}
            </button>
          )}
          {showSheet && (
            dsaSheetUrl ? (
              <button
                onClick={() => window.open(dsaSheetUrl, '_blank')}
                className="flex-1 bg-[#00bfff] hover:bg-[#33ccff] text-white px-4 py-3 rounded-full font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8.75 3.5V2c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.56c.25-.03.48-.06.75-.06h.75ZM16.75 3.56V2c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.5H16c.27 0 .5.03.75.06Z" fill="#d9e3f0"></path><path d="M16.75 3.56V5c0 .41-.34.75-.75.75s-.75-.34-.75-.75V3.5h-6.5V5c0 .41-.34.75-.75.75s-.75-.34-.75-.75V3.56C4.3 3.83 3 5.73 3 8.5V17c0 3 1.5 5 5 5h8c3.5 0 5-2 5-5V8.5c0-2.77-1.3-4.67-4.25-4.94ZM12 16.75H8c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h4c.41 0 .75.34.75.75s-.34.75-.75.75Zm4-5H8c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h8c.41 0 .75.34.75.75s-.34.75-.75.75Z" fill="#d9e3f0"></path></svg>
                {shouldShowLabels && <span>Sheet</span>}
              </button>
            ) : (
              <button
                onClick={() => setShowDsaSheetInput(true)}
                className="flex-1 bg-[#00bfff] hover:bg-[#33ccff] text-white px-4 py-3 rounded-full font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M12 18v-6"/>
                  <path d="M9 15h6"/>
                </svg>
                {shouldShowLabels && <span>Add Url</span>}
              </button>
            )
          )}

          {/* Settings Button  */}
          <button 
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className=" bg-zinc-700 w-fit flex items-center justify-center text-white/70 hover:text-white transition-colors p-1 px-4 rounded-full hover:bg-white/10"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        {/* Settings Dropdown Menu */}
        {showSettingsMenu && (
          <div className="absolute top-10 right-2 z-20 bg-zinc-900 rounded-lg shadow-lg border border-zinc-700 p-2 w-60 transition-all" ref={settingsMenuRef}>
            <div className="flex flex-col gap-1.5">
              {/* Button Visibility Toggles */}
              <div className="border-b border-zinc-700 pb-2 mb-1">
                <p className="text-xs text-white/60 mb-2 px-2">Button Visibility</p>
                
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-800 rounded transition-colors" onClick={() => toggleButtonVisibility(LEETCODE_SHOW_CONTEST_KEY, showContest, setShowContest)}>
                  <label className="text-sm text-white/80 cursor-pointer flex-1">Contest</label>
                  <div 
                    className="relative inline-block w-10 align-middle cursor-pointer"
                    onClick={() => toggleButtonVisibility(LEETCODE_SHOW_CONTEST_KEY, showContest, setShowContest)}
                  >
                    <input 
                      type="checkbox" 
                      id="contestToggle" 
                      className="sr-only" 
                      checked={showContest}
                      readOnly
                    />
                    <div className={`block w-10 h-6 rounded-full ${showContest ? 'bg-[#3A3A3D]' : 'bg-zinc-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showContest ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-800 rounded transition-colors" onClick={() => toggleButtonVisibility(LEETCODE_SHOW_STUDY_PLAN_KEY, showStudyPlan, setShowStudyPlan)}>
                  <label className="text-sm text-white/80 cursor-pointer flex-1">Study Plan</label>
                  <div 
                    className="relative inline-block w-10 align-middle cursor-pointer"
                    onClick={() => toggleButtonVisibility(LEETCODE_SHOW_STUDY_PLAN_KEY, showStudyPlan, setShowStudyPlan)}
                  >
                    <input 
                      type="checkbox" 
                      id="studyPlanToggle" 
                      className="sr-only" 
                      checked={showStudyPlan}
                      readOnly
                    />
                    <div className={`block w-10 h-6 rounded-full ${showStudyPlan ? 'bg-[#8957e5]' : 'bg-zinc-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showStudyPlan ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-800 rounded transition-colors" onClick={() => toggleButtonVisibility(LEETCODE_SHOW_DAILY_KEY, showDaily, setShowDaily)}>
                  <label className="text-sm text-white/80 cursor-pointer flex-1">Daily Problem</label>
                  <div 
                    className="relative inline-block w-10 align-middle cursor-pointer"
                    onClick={() => toggleButtonVisibility(LEETCODE_SHOW_DAILY_KEY, showDaily, setShowDaily)}
                  >
                    <input 
                      type="checkbox" 
                      id="dailyToggle" 
                      className="sr-only" 
                      checked={showDaily}
                      readOnly
                    />
                    <div className={`block w-10 h-6 rounded-full ${showDaily ? 'bg-[#c30052]' : 'bg-zinc-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showDaily ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-800 rounded transition-colors" onClick={() => toggleButtonVisibility(LEETCODE_SHOW_SHEET_KEY, showSheet, setShowSheet)}>
                  <label className="text-sm text-white/80 cursor-pointer flex-1">Sheet</label>
                  <div 
                    className="relative inline-block w-10 align-middle cursor-pointer"
                    onClick={() => toggleButtonVisibility(LEETCODE_SHOW_SHEET_KEY, showSheet, setShowSheet)}
                  >
                    <input 
                      type="checkbox" 
                      id="sheetToggle" 
                      className="sr-only" 
                      checked={showSheet}
                      readOnly
                    />
                    <div className={`block w-10 h-6 rounded-full ${showSheet ? 'bg-[#00bfff]' : 'bg-zinc-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showSheet ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => { 
                  setShowSettingsMenu(false);
                  setShowInput(true); 
                }}
                className="flex items-center gap-2 text-sm text-left text-white/80 hover:text-white hover:bg-zinc-800 p-2 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7h-3a2 2 0 0 1-2-2V2"/>
                  <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/>
                  <path d="M3 15h6"/>
                  <path d="M6 18l3-3-3-3"/>
                </svg>
                Change Username
              </button>
              <button 
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowDsaSheetInput(true);
                }}
                className="flex items-center gap-2 text-sm text-left text-white/80 hover:text-white hover:bg-zinc-800 p-2 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M12 18v-6"/>
                  <path d="M9 15h6"/>
                </svg>
                Change DSA Sheet URL
              </button>
            </div>
          </div>
        )}

        {showDsaSheetInput && (
          <div className="fixed inset-0 bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] rounded-2xl flex flex-col items-center justify-center p-6 w-full max-w-md relative">
              <h3 className="text-xl font-semibold mb-6 text-white">Enter DSA Sheet URL</h3>
              <input
                type="text"
                value={dsaSheetUrl}
                onChange={(e) => setDsaSheetUrl(e.target.value)}
                placeholder="Your DSA Sheet URL"
                className="p-3 border border-gray-600 rounded-xl w-full mb-6 bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-[#00bfff]"
              />
              <div className="flex space-x-4">
                <button
                  onClick={handleDsaSheetUrlSave}
                  className="bg-[#00bfff] hover:bg-[#33ccff] text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowDsaSheetInput(false)}
                  className="bg-[#3A3A3D] hover:bg-[#4A4A4D] text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#222126] p-4 rounded-xl shadow-xl flex flex-col items-center justify-center h-full">
      <div className="text-center text-gray-600 dark:text-gray-400">
          <p>No LeetCode stats to display. Please ensure your username is correct or enter one above.</p>
          <button
            onClick={() => {
              setShowInput(true);
            }}
            className="bg-[#ff4101] text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors mt-4"
          >
            Enter Username
          </button>
      </div>
    </div>
  );
};

export default LeetCodeWidget;