import React from "react";
import flame from '../components/icons image/flame.webp'

interface StreakCardProps {
  streakCount: number;
  penguinImg: string; // PNG path
  username?: string; // LeetCode username for profile link
  isStreakAtRisk?: boolean;
  streakTimeLeft?: string;
}

const StreakCard: React.FC<StreakCardProps> = ({ streakCount, penguinImg, username, isStreakAtRisk, streakTimeLeft }) => {
  // Open LeetCode profile when penguin is clicked
  const handlePenguinClick = () => {
    if (username) {
      window.open(`https://leetcode.com/${username}`, '_blank');
    }
  };
  // Determine gradient color based on penguin image
  const getBgGradient = () => {
    // Extract the penguin type from the imported object reference in LeetcodeWidget
    // This is more reliable than path checking which can break in production builds
    const imgPath = penguinImg.toLowerCase();
    
    // Debug log to see the image path in production
    console.log('Penguin image path:', imgPath);

    // Function to get the last part of the path (filename)
    const getFileNameFromPath = (path: string): string => {
      // Handle both URL-style paths and filesystem paths
      const parts = path.split(/[/\\]/);
      return parts[parts.length - 1];
    };

    const fileName = getFileNameFromPath(imgPath);
    console.log('Extracted filename:', fileName);

    // Match based on the filename
    if (fileName.includes('chilling')) 
      return 'from-transparent to-green-700';
    if (fileName.includes('sleepingWithStreakPenguin')) 
      return 'from-transparent to-indigo-700';
    if (fileName.includes('angry') && !fileName.includes('more')) 
      return 'from-transparent to-orange-900';
    if (fileName.includes('cry') && !fileName.includes('more')) 
      return 'from-transparent to-slate-900';
    if (fileName.includes('happy')) 
      return 'from-transparent to-green-900';
    if (fileName.includes('love')) 
      return 'from-transparent to-pink-900';
    if (fileName.includes('more') && fileName.includes('angry')) 
      return 'from-transparent to-red-900';
    if (fileName.includes('more') && fileName.includes('cry')) 
      return 'from-transparent to-zinc-900';
    if (fileName.includes('neutral')) 
      return 'from-transparent to-blue-900';
    if (fileName.includes('sad')) 
      return 'from-transparent to-gray-900';
    
    // Default fallback
    return 'from-transparent to-zinc-900';
  };
  return (
  <div
  onClick={handlePenguinClick}
    className={`w-[100%] h-[100%] cursor-pointer bg-gradient-to-b ${getBgGradient()} rounded-2xl p-4 flex flex-col justify-between items-center relative overflow-hidden`}
  >
    {/* Top Row: Streak Number & Label, Flame */}
    <div className="w-full flex gap-1 flex-row items-start justify-between">

         
      <div className="flex flex-col items-start gap-[2px]">
          <span
            className={`text-xl font-bold leading-none font-sans tracking-tight ${
              isStreakAtRisk ? "text-gray-500" : "text-[#ff2d55]"
            }`}
          >
            {streakCount}
          </span>

          <span className="text-white font-light text-xs leading-tight font-sans opacity-90 mt-[2px] tracking-wide drop-shadow-sm whitespace-pre-line">
            Streak
          </span>

      </div>      
      {/* Flame icon with dynamic styling based on streak */}
      <div
        className={`mt-[2px] ${
          streakCount > 0 && !isStreakAtRisk
            ? "drop-shadow-[0_0_12px_#ffb300]"
            : ""
        }`}
      >
        <img
          src={flame}
          className={`w-12 ${
            streakCount === 0 || isStreakAtRisk
              ? "filter grayscale opacity-50"
              : ""
          }`}
          alt=""
        />
      </div>

    </div>    {/* Penguin at bottom center - clickable to open LeetCode profile */}    
    <img
      src={penguinImg}
      alt="penguin"
   
      className={`w-[64%] z-10 object-contain absolute left-1/2 -bottom-[6px] -translate-x-1/2 ${username ? 'cursor-pointer hover:scale-105 transition-transform' : 'pointer-events-none'} z-20`}
      title={username ? `Open ${username}'s LeetCode profile` : ''}
    />
  </div>
  );
};

export default StreakCard;
