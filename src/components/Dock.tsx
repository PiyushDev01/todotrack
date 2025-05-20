import React, { useState } from 'react';
import { 
  FiSettings, 
  FiCheck,
  FiEdit,
  FiLayout,
  FiPlus,
  FiGrid
} from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useWidgetContext } from '../context/WidgetContext';

const Dock: React.FC = () => {
  const { isEditingLayout, setIsEditingLayout, showWidgetSelector, setShowWidgetSelector } = useWidgetContext();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  const handleEditLayoutToggle = () => {
    setIsEditingLayout(!isEditingLayout);
    setShowSettings(false);
  };

  const handleSettingsClick = () => {
    setActiveIcon(activeIcon === 'settings' ? null : 'settings');
    setShowSettings(!showSettings);
  };
    // Placeholder for future hover animations
  const handleIconHover = () => {
    // This could be expanded later for hover animations
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {/* Settings popup */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-end"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="absolute bottom-16 right-6 min-w-[200px]"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            style={{ zIndex: 101, pointerEvents: 'auto' }}
          >
            <div
              className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 transition-all duration-300 animate-settings-fade-in"
              style={{
                animation: showSettings
                  ? 'settings-fade-in 0.28s cubic-bezier(0.4,0,0.2,1)'
                  : 'settings-fade-out 0.22s cubic-bezier(0.4,0,0.2,1)'
              }}
            >
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Settings</h3>
                
                <div className="flex items-center justify-between">
                  <button 
                    onClick={handleEditLayoutToggle}
                    className="w-full text-left py-2 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Edit Layout
                  </button>
                  <button 
                    onClick={handleEditLayoutToggle}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                      isEditingLayout 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } hidden`}
                    // Hide the icon button
                  >
                    {isEditingLayout ? <FiCheck size={18} /> : <FiEdit size={18} />}
                  </button>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">TodoTrack</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">v1.2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main dock - Magic UI style */}
      <div className="flex items-center backdrop-blur-lg bg-white/75 dark:bg-zinc-800/80 rounded-2xl shadow-xl p-1.5 border border-white/20 dark:border-zinc-700/50">
        <div className="flex gap-1">
          {/* Settings Button */}          <button 
            onClick={handleSettingsClick}
            onMouseEnter={handleIconHover}
            className={`group relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-300 ${
              activeIcon === 'settings' || showSettings
                ? 'bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-600 dark:text-blue-400 scale-100'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-700/50 hover:scale-[1.03]'
            }`}
          >
            <FiSettings size={22} className={`transition-all duration-300 ${activeIcon === 'settings' ? 'scale-110' : ''}`} />
            {(activeIcon === 'settings' || showSettings) && (
              <span className={`absolute -top-8 text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
                ${theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-zinc-900 border border-zinc-200 shadow'}
              `}>
                Settings
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 self-center bg-gray-200 dark:bg-gray-700 mx-1"></div>
          
          {/* Widget+ Button */}
          <div className="flex items-center">
            <button
              onClick={() => setShowWidgetSelector(true)}
              onMouseEnter={handleIconHover}
              className="group relative flex items-center justify-center h-12 w-12 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-700/50 hover:scale-[1.03] transition-all duration-300"
            >
              <FiPlus size={22} />
              <span className={`absolute -top-8 text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
                ${theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-zinc-900 border border-zinc-200 shadow'}
              `}>
                Add Widget
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Edit layout floating button - shows when in edit mode */}
      {isEditingLayout && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in">
          <button 
            onClick={handleEditLayoutToggle}
            className="flex items-center justify-center gap-2 h-12 px-6 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all"
          >
            <FiCheck size={20} />
            <span className="font-medium">Done</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dock;

/* Add to your global CSS (index.css):
@keyframes settings-fade-in {
  from { opacity: 0; transform: translateY(32px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes settings-fade-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(32px) scale(0.98); }
}
*/
