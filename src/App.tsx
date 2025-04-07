import React, { useState, useMemo, useEffect } from 'react';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { Analytics } from './components/Analytics';
import { Heatmap } from './components/Heatmap';
import { QuickLinks } from './components/QuickLinks';
import type { Task, Filter } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const STORAGE_KEY = 'todo-tracker-tasks';
const DAILY_DATA_KEY = 'todo-tracker-daily-data';

interface StoredTask {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  timestamp: string;
  isRepeating: boolean;
  lastCompleted?: string;
}

interface DailyData {
  date: string;
  completedTasks: number;
  totalTasks: number;
  completedTaskIds: string[];
  repeatingTaskIds: string[];
  nonRepeatingTaskIds: string[];
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Load tasks from localStorage on initial render
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks) as StoredTask[];
        const now = new Date();
        const today = new Date(now);
        if (now.getHours() < 5) {
          today.setDate(today.getDate() - 1);
        }
        const todayStr = format(today, 'yyyy-MM-dd');

        // Convert timestamp strings back to numbers and ensure all required fields
        return parsedTasks.map(task => ({
          ...task,
          timestamp: Number(task.timestamp),
          lastCompleted: task.lastCompleted ? Number(task.lastCompleted) : undefined,
          isRepeating: task.isRepeating || false,
          priority: task.priority || 'medium',
          completed: false // Reset all tasks to incomplete for the new day
        })).filter(task => {
          // Keep repeating tasks and today's non-repeating tasks
          if (task.isRepeating) return true;
          const taskDate = format(new Date(task.timestamp), 'yyyy-MM-dd');
          return taskDate === todayStr;
        });
      } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  const [dailyData, setDailyData] = useState<DailyData[]>(() => {
    const savedData = localStorage.getItem(DAILY_DATA_KEY);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (error) {
        console.error('Error loading daily data from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }, [tasks]);

  // Save daily data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(DAILY_DATA_KEY, JSON.stringify(dailyData));
    } catch (error) {
      console.error('Error saving daily data to localStorage:', error);
    }
  }, [dailyData]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadData = () => {
      try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        const savedDailyData = localStorage.getItem(DAILY_DATA_KEY);

        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks) as StoredTask[];
          setTasks(parsedTasks.map(task => ({
            ...task,
            timestamp: Number(task.timestamp),
            lastCompleted: task.lastCompleted ? Number(task.lastCompleted) : undefined,
            isRepeating: task.isRepeating || false,
            priority: task.priority || 'medium'
          })));
        }

        if (savedDailyData) {
          setDailyData(JSON.parse(savedDailyData));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };

    loadData();
  }, []);

  // Update daily data when tasks change
  useEffect(() => {
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < 5) {
      today.setDate(today.getDate() - 1);
    }
    const todayStr = format(today, 'yyyy-MM-dd');

    const completedTasks = tasks.filter(task => {
      const taskDate = new Date(task.completed ? task.timestamp : task.lastCompleted || 0);
      const taskDay = new Date(taskDate);
      if (taskDate.getHours() < 5) {
        taskDay.setDate(taskDay.getDate() - 1);
      }
      return format(taskDay, 'yyyy-MM-dd') === todayStr && task.completed;
    });

    // Get repeating task IDs
    const repeatingTaskIds = tasks
      .filter(task => task.isRepeating)
      .map(task => task.id);

    // Get non-repeating task IDs for today only
    const nonRepeatingTaskIds = tasks
      .filter(task => !task.isRepeating && format(new Date(task.timestamp), 'yyyy-MM-dd') === todayStr)
      .map(task => task.id);

    // Calculate total tasks for today (repeating + today's non-repeating)
    const totalTasksForToday = repeatingTaskIds.length + nonRepeatingTaskIds.length;

    setDailyData(prevData => {
      const existingDayIndex = prevData.findIndex(d => d.date === todayStr);
      if (existingDayIndex >= 0) {
        const newData = [...prevData];
        newData[existingDayIndex] = {
          date: todayStr,
          completedTasks: completedTasks.length,
          totalTasks: totalTasksForToday,
          completedTaskIds: completedTasks.map(task => task.id),
          repeatingTaskIds: repeatingTaskIds,
          nonRepeatingTaskIds: nonRepeatingTaskIds
        };
        return newData;
      } else {
        return [...prevData, {
          date: todayStr,
          completedTasks: completedTasks.length,
          totalTasks: totalTasksForToday,
          completedTaskIds: completedTasks.map(task => task.id),
          repeatingTaskIds: repeatingTaskIds,
          nonRepeatingTaskIds: nonRepeatingTaskIds
        }];
      }
    });
  }, [tasks]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter tasks to show all tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    });
  }, [tasks, filter]);

  // Check and reset repeating tasks at 5 AM
  useEffect(() => {
    const checkAndResetTasks = () => {
      const now = new Date();
      const fiveAM = new Date(now);
      fiveAM.setHours(5, 0, 0, 0);
      
      // Check if it's 5 AM
      if (now.getHours() === 5 && now.getMinutes() === 0) {
        setTasks(prevTasks => {
          // Get all repeating tasks
          const repeatingTasks = prevTasks.filter(task => task.isRepeating);
          
          // Create new instances of repeating tasks for today
          const newTasks = repeatingTasks.map(task => ({
            ...task,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            completed: false,
            timestamp: Date.now(),
            lastCompleted: task.completed ? Date.now() : task.lastCompleted
          }));

          // Only keep repeating tasks
          return [...newTasks];
        });

        // Update daily data for the new day
        const today = new Date();
        if (today.getHours() < 5) {
          today.setDate(today.getDate() - 1);
        }
        const todayStr = format(today, 'yyyy-MM-dd');

        setDailyData(prevData => {
          const existingDayIndex = prevData.findIndex(d => d.date === todayStr);
          if (existingDayIndex >= 0) {
            const newData = [...prevData];
            newData[existingDayIndex] = {
              date: todayStr,
              completedTasks: 0,
              totalTasks: 0, // Will be updated with repeating tasks when they're added
              completedTaskIds: [],
              repeatingTaskIds: [], // Will be populated with repeating tasks when they're added
              nonRepeatingTaskIds: [] // Will be empty for new day
            };
            return newData;
          } else {
            return [...prevData, {
              date: todayStr,
              completedTasks: 0,
              totalTasks: 0, // Will be updated with repeating tasks when they're added
              completedTaskIds: [],
              repeatingTaskIds: [], // Will be populated with repeating tasks when they're added
              nonRepeatingTaskIds: [] // Will be empty for new day
            }];
          }
        });
      }
    };

    // Check every minute
    const interval = setInterval(checkAndResetTasks, 60000);
    checkAndResetTasks(); // Initial check

    return () => clearInterval(interval);
  }, []);

  // Calculate real heatmap data for the selected month
  const heatmapData = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const data: { [key: string]: number } = {};
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayData = dailyData.find(d => d.date === dateKey);
      data[dateKey] = dayData?.completedTasks || 0;
    });
    
    return data;
  }, [dailyData, selectedMonth]);

  // Calculate real analytics data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < 5) {
      today.setDate(today.getDate() - 1);
    }
    const todayStr = format(today, 'yyyy-MM-dd');

    // Get all days with completed tasks
    const activeDays = dailyData.filter(day => day.completedTasks > 0);
    
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Sort days in ascending order
    const sortedDays = [...activeDays].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sortedDays.length; i++) {
      const currentDate = new Date(sortedDays[i].date);
      const nextDate = i < sortedDays.length - 1 ? new Date(sortedDays[i + 1].date) : null;
      
      // Calculate day difference
      const dayDiff = nextDate 
        ? Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (dayDiff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      // Check if this is part of the current streak
      const todayDate = new Date(todayStr);
      const daysSinceLast = Math.floor((todayDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLast === 0) {
        currentStreak = tempStreak;
      }
    }

    // Calculate completion rate
    const totalCompletedTasks = dailyData.reduce((sum, day) => sum + day.completedTasks, 0);
    const totalPossibleTasks = dailyData.reduce((sum, day) => sum + day.totalTasks, 0);
    const completionRate = totalPossibleTasks > 0 
      ? Math.round((totalCompletedTasks / totalPossibleTasks) * 100) 
      : 0;

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: activeDays.length,
      completionRate,
    };
  }, [dailyData]);

  const addTask = (text: string, priority: Task['priority'], isRepeating: boolean = false) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text,
      priority,
      completed: false,
      timestamp: Date.now(),
      isRepeating,
      lastCompleted: undefined
    };
    setTasks([newTask, ...tasks]);
  };

  const toggleTask = (id: string) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.id === id) {
          const now = Date.now();
          return {
            ...task,
            completed: !task.completed,
            timestamp: now,
            lastCompleted: !task.completed ? now : task.lastCompleted
          };
        }
        return task;
      });

      // Update daily data immediately after task state changes
      const now = new Date();
      const today = new Date(now);
      if (now.getHours() < 5) {
        today.setDate(today.getDate() - 1);
      }
      const todayStr = format(today, 'yyyy-MM-dd');

      const completedTasks = updatedTasks.filter(task => {
        const taskDate = new Date(task.completed ? task.timestamp : task.lastCompleted || 0);
        const taskDay = new Date(taskDate);
        if (taskDate.getHours() < 5) {
          taskDay.setDate(taskDay.getDate() - 1);
        }
        return format(taskDay, 'yyyy-MM-dd') === todayStr && task.completed;
      });

      setDailyData(prevData => {
        const existingDayIndex = prevData.findIndex(d => d.date === todayStr);
        if (existingDayIndex >= 0) {
          const newData = [...prevData];
          newData[existingDayIndex] = {
            date: todayStr,
            completedTasks: completedTasks.length,
            totalTasks: updatedTasks.length,
            completedTaskIds: completedTasks.map(task => task.id),
            repeatingTaskIds: updatedTasks.filter(task => task.isRepeating).map(task => task.id),
            nonRepeatingTaskIds: updatedTasks.filter(task => !task.isRepeating).map(task => task.id)
          };
          return newData;
        } else {
          return [...prevData, {
            date: todayStr,
            completedTasks: completedTasks.length,
            totalTasks: updatedTasks.length,
            completedTaskIds: completedTasks.map(task => task.id),
            repeatingTaskIds: updatedTasks.filter(task => task.isRepeating).map(task => task.id),
            nonRepeatingTaskIds: updatedTasks.filter(task => !task.isRepeating).map(task => task.id)
          }];
        }
      });

      return updatedTasks;
    });
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const updateTask = (id: string, text: string) => {
    if (!text.trim()) return; // Don't update if text is empty or only whitespace
    
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, text: text.trim() } : task
    ));
  };

  const reorderTasks = (newTasks: Task[]) => {
    // Update the order of all tasks, not just filtered ones
    setTasks(newTasks);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-ubuntu">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-8 h-[calc(100vh-2rem)]">
        <div className="col-span-1 md:col-span-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img className='w-10' src="/src/components/icon.png" alt="" />
              <h1 className="text-3xl font-bold tracking-tight">Daily Tasks</h1>
            </div>
            <div className="hidden md:flex text-lg items-center justify-center gap-2 text-gray-400">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
              <span className="ml-2 font-semibold text-4xl font-mono tracking-tight">
                {format(currentTime, 'hh:mm:ss a')}
              </span>
            </div>
          </div>

          <QuickLinks />
          
          <div className="flex gap-4 mb-6">
            {(['all', 'active', 'completed'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full transition-all ${
                  filter === f ? 'bg-blue-600' : 'bg-gray-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <TaskInput onAddTask={addTask} />
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <TaskList
            tasks={filteredTasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onUpdateTask={updateTask}
              onReorderTasks={reorderTasks}
          />
          </div>
        </div>

        <div className="col-span-1 w-[80%] md:col-span-2 bg-gray-800 p-4 md:p-6 rounded-xl overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold mb-6">Analytics</h2>
          <Analytics data={analyticsData} />
          <Heatmap 
            data={heatmapData} 
            dailyData={dailyData}
            tasks={tasks}
            selectedDate={selectedMonth}
            onDateChange={setSelectedMonth}
          />
        </div>
      </div>
    </div>
  );
}

export default App;