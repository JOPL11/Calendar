'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths } from 'date-fns';
import '../app/globals.css';
import SplashScreen from './SplashScreen';
import { saveToFile, openFromFile } from '../utils/fileHandlers';

// Helper function to ensure text is readable on colored backgrounds
const getContrastColor = (hexColor) => {
  // If the color is not a valid hex color, return black
  if (!hexColor || typeof hexColor !== 'string') return '#000000';
  
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Calendar View Component
const EventPreview = ({ content, initialContent = '', onContentChange, onClose, onSave }) => {
  const [localContent, setLocalContent] = useState(initialContent);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  
  // Focus the textarea when component mounts
  useEffect(() => {
    setLocalContent(initialContent);
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = initialContent.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [initialContent]);
  
  const handleChange = (e) => {
    setLocalContent(e.target.value);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
      e.preventDefault();
      handleClose();
    }
  };
  
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(localContent);
    } else {
      onContentChange(localContent);
    }
    onClose();
  }, [localContent, onContentChange, onClose, onSave]);
  
  const handleClose = () => {
    if (onContentChange && localContent !== content) {
      onContentChange(localContent);
    }
    if (onClose) onClose();
  };
  
  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [localContent]);
  
  return (
    <div 
      className="event-preview-overlay"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)'
      }}
      onMouseDown={(e) => {
        // Close when clicking on the overlay
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        ref={previewRef}
        className="event-preview"
        style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          padding: '20px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          height: 'auto',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1001,
          transform: 'translateY(0)',
          transition: 'all 0.2s ease-out',
          outline: 'none'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        tabIndex="-1"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Press Cmd+Enter or Ctrl+Enter to save</div>
          <button 
            onClick={handleClose} 
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0 8px',
              borderRadius: '4px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            ×
          </button>
        </div>
        <textarea 
          ref={textareaRef}
          value={localContent || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '12px',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
            minHeight: '200px',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#fff'
          }}
          placeholder="Type your detailed content here..."
        />
      </div>
    </div>
  );
};

const CalendarView = ({
  months,
  events,
  colorPickers,
  dayNames,
  onAddMonth,
  onSave,
  onToggleColorPicker,
  onAddEvent,
  onEventChange,
  onClearAllEvents,
  lastSaved
}) => {
  const [preview, setPreview] = useState({
    content: '',
    eventId: null,
    dateKey: null,
    show: false,
    isPreviewContent: false
  });
  
  const previewTimer = useRef(null);
  const isHoveringPreview = useRef(false);
  const isClosing = useRef(false);

  const handlePreviewClose = useCallback(() => {
    if (isClosing.current) return;
    
    isClosing.current = true;
    
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    
    setPreview(prev => ({
      ...prev,
      show: false
    }));
    
    // Reset after animation completes
    previewTimer.current = setTimeout(() => {
      setPreview({
        content: '',
        eventId: null,
        dateKey: null,
        show: false,
        isPreviewContent: false
      });
      isClosing.current = false;
      previewTimer.current = null;
    }, 200);
  }, []);

  const handlePreviewMouseEnter = useCallback(() => {
    isHoveringPreview.current = true;
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
  }, []);

  const handlePreviewMouseLeave = useCallback((e) => {
    // Only proceed if we're not moving to an event element
    if (!e.relatedTarget?.closest('.event-item')) {
      isHoveringPreview.current = false;
      if (previewTimer.current) {
        clearTimeout(previewTimer.current);
      }
      
      if (!isClosing.current) {
        previewTimer.current = setTimeout(() => {
          if (!isHoveringPreview.current) {
            handlePreviewClose();
          }
        }, 150); // Reduced delay for smoother transition
      }
    }
  }, [handlePreviewClose]);

  const handleEventHover = useCallback((e, event, dateKey) => {
    if (isClosing.current) return;
    
    // Clear any pending hide
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setPreview({
      content: event.previewContent || '',
      eventId: event.id,
      dateKey,
      position: { top: rect.bottom + window.scrollY, left: rect.left },
      isPreviewContent: true,
      show: true
    });
  }, []);

  const handleEventLeave = useCallback((e) => {
    // Don't hide if moving to the preview or another event
    if (e.relatedTarget?.closest('.event-preview') || e.relatedTarget?.closest('.event-item')) {
      return;
    }
    
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }
    
    previewTimer.current = setTimeout(() => {
      setPreview(prev => ({
        ...prev,
        show: false
      }));
    }, 150);
  }, []);

  const handleEventClick = useCallback((e, event, dateKey) => {
    e.stopPropagation();
    
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Make sure we have a valid dateKey
    const eventDateKey = dateKey || format(new Date(), 'yyyy-MM-dd');
    
    setPreview({
      content: event.previewContent || '',
      eventId: event.id,
      dateKey: eventDateKey,
      position: { top: rect.bottom + window.scrollY, left: rect.left },
      isPreviewContent: true,
      show: true
    });
  }, []);

  const handlePreviewChange = useCallback((content) => {
    if (preview.eventId && preview.dateKey) {
      onEventChange(
        new Date(preview.dateKey),
        preview.eventId,
        'previewContent',
        content
      );
    }
  }, [preview.eventId, preview.dateKey, onEventChange]);

  const handlePreviewSave = useCallback((content) => {
    if (preview.eventId && preview.dateKey) {
      onEventChange(
        new Date(preview.dateKey),
        preview.eventId,
        'previewContent',
        content
      );
    }
  }, [preview.eventId, preview.dateKey, onEventChange]);

  const renderMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(date);
    const firstDayOfMonth = getDay(startOfMonth(date));
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="day empty"></div>);
    }

    // Get all days in the month as an array of dates
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      days.push(currentDate);
    }
    
    return days.map((currentDate, index) => {
      if (index < firstDayOfMonth) return days[index];

      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayEvents = events[dateKey] || [];
      const dayOfWeek = format(currentDate, 'EEEE');
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;
      const dayNumber = format(currentDate, 'd');
      
      return (
        <div key={dateKey} className={`timeline-day ${isToday ? 'today' : ''}`}>
          <div className="timeline-day-header">
            <div className="day-name-and-date">
              <span className="timeline-day-name">{dayOfWeek}</span>
              <div className="date-and-picker">
                <span className="timeline-day-number">{dayNumber}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleColorPicker(currentDate);
                  }}
                  className="add-event-button"
                  aria-label="Add event"
                  title="Add event"
                >
                  +
                </button>
                {colorPickers[dateKey] && (
                  <div className="color-picker">
                    {['red', 'blue', 'green', 'yellow'].map(color => (
                      <button
                        key={color}
                        className={`color-option ${color}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddEvent(currentDate, color);
                          onToggleColorPicker(currentDate);
                        }}
                        aria-label={`Add ${color} event`}
                        title={`Add ${color} event`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="timeline-events">
            <div className="events">
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  className="event event-item"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${event.color || '#e2e8f0'}`,
                    color: '#000000',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    padding: '4px 8px',
                    margin: '2px 0',
                    borderRadius: '2px'
                  }}
                  onMouseEnter={(e) => handleEventHover(e, event, dateKey)}
                  onMouseLeave={handleEventLeave}
                  onClick={(e) => handleEventClick(e, event)}
                >
                  <div 
                    className="event-content"
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '100%',
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <input
                      type="text"
                      value={event.title}
                      onChange={(e) => onEventChange(currentDate, event.id, 'title', e.target.value)}
                      className="event-title-input"
                      data-event-id={event.id}
                      placeholder="Event title..."
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        padding: '2px 4px',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flex: 1,
                        boxShadow: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        WebkitFocusRingColor: 'transparent',
                        outlineWidth: 0,
                        outlineOffset: 0,
                        outlineStyle: 'none',
                        borderImage: 'none',
                        WebkitUserSelect: 'text',
                        userSelect: 'text'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="timeline-container">
      {preview.show && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            style={{
              pointerEvents: 'auto',
              maxWidth: '80%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onMouseEnter={handlePreviewMouseEnter}
            onMouseLeave={handlePreviewMouseLeave}
          >
            <EventPreview 
              content={preview.content}
              initialContent={preview.content}
              onContentChange={handlePreviewChange}
              onClose={handlePreviewClose}
              onSave={handlePreviewSave}
            />
          </div>
        </div>
      )}
      <div className="timeline-actions">
        <button 
          onClick={onSave} 
          className="action-button save-button"
          title="Save calendar"
        >
          💾 Save
        </button>
        <button 
          onClick={onClearAllEvents} 
          className="action-button clear-button"
          title="Clear all events"
        >
          🗑️ Clear All
        </button>
        <button 
          onClick={onAddMonth} 
          className="action-button add-month-button"
          title="Add next month"
        >
          ➕ Add Month
        </button>
        {lastSaved && (
          <div className="last-saved">
            Last saved: {format(lastSaved, 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </div>
      
      <div className="timeline-months">
        {months.map((month, index) => (
          <div key={month.toString()} className="timeline-month">
            <h2 className="month-title">{format(month, 'MMMM yyyy')}</h2>
            <div className="timeline-days">
              {renderMonth(month)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Timeline Component
const Timeline = () => {
  // State declarations
  const [months, setMonths] = useState([new Date(2025, 3, 1)]);
  const [events, setEvents] = useState({});
  const [colorPickers, setColorPickers] = useState({});
  const [isClient, setIsClient] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fileHandle, setFileHandle] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Memoized values
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const sanitize = useMemo(() => {
    return typeof window !== 'undefined' ? DOMPurify(window) : { sanitize: html => html };
  }, []);
  
  // Effects
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Event handlers
  const toggleColorPicker = useCallback((date) => {
    if (!isClient) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    setColorPickers(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  }, [isClient]);

  const handleAddEvent = useCallback((date, color = null) => {
    if (!isClient) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const newEventId = Date.now();
    
    setEvents(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), { 
        id: newEventId, 
        title: '',
        previewContent: '',
        color: color || null
      }]
    }));
    
    setColorPickers(prev => ({
      ...prev,
      [dateKey]: false
    }));
    
    // Focus the title input after a small delay to allow the component to render
    setTimeout(() => {
      const input = document.querySelector(`.event-title-input[data-event-id="${newEventId}"]`);
      if (input) {
        input.focus();
      }
    }, 100);
  }, [isClient]);

  const handleEventChange = useCallback((date, eventId, field, newValue) => {
    if (!isClient) return;
    
    // Sanitize the input
    const cleanValue = sanitize.sanitize(newValue, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // If it's a title, limit to one line
    const finalValue = field === 'title' ? cleanValue.split('\n')[0] : cleanValue;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    setEvents(prev => {
      const updatedEvents = {
        ...prev,
        [dateKey]: (prev[dateKey] || []).map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                [field]: finalValue
              } 
            : event
        )
      };
      
      if (updatedEvents[dateKey] && updatedEvents[dateKey].length === 0) {
        delete updatedEvents[dateKey];
      }
      
      return updatedEvents;
    });
  }, [isClient, sanitize]);
  
  const clearAllEvents = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all events? This cannot be undone.')) {
      setEvents({});
    }
  }, []);

  const addMonth = useCallback(() => {
    if (!isClient) return;
    setMonths(prev => [...prev, addMonths(prev[prev.length - 1], 1)]);
  }, [isClient]);

  const handleSave = useCallback(async (forceDownload = false) => {
    if (!isClient) return false;
    
    // Check if File System Access API is available
    const isFileSystemAccessAPIAvailable = () => {
      return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
    };
    
    // Create a safe wrapper around file operations with timeout
    const withTimeout = async (promise, timeout = 3000) => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      );
      return Promise.race([promise, timeoutPromise]);
    };

    try {
      // If we have a file handle and FS API is available, try to use it
      if (isFileSystemAccessAPIAvailable() && fileHandle && typeof fileHandle.createWritable === 'function') {
        try {
          const writable = await withTimeout(fileHandle.createWritable());
          await withTimeout(writable.write(JSON.stringify({ events }, null, 2)));
          await withTimeout(writable.close());
          setLastSaved(new Date());
          return true;
        } catch (err) {
          console.warn('Failed to use existing file handle:', err);
          // Only try to get a new file handle if this was a manual save and FS API is available
          if (forceDownload && isFileSystemAccessAPIAvailable()) {
            console.log('Attempting to get a new file handle...');
          } else {
            // If FS API isn't available, fall through to download
            if (!forceDownload) return false;
          }
        }
      }
      
      // If we get here, either:
      // 1. This is a manual save (forceDownload = true), or
      // 2. Auto-save failed and we need to fall back to download
      if (forceDownload) {
        // If FS API is available, try to get a new file handle
        if (isFileSystemAccessAPIAvailable()) {
          try {
            const newFileHandle = await withTimeout(saveToFile({ events }));
            if (newFileHandle) {
              setFileHandle(newFileHandle);
              setLastSaved(new Date());
              return true;
            }
          } catch (err) {
            console.error('Error in saveToFile:', err);
            // Fall through to download
          }
        }
        
        // Last resort: Use download method
        const blob = new Blob([JSON.stringify({ events }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        setLastSaved(new Date());
        return true;
      }
      
      return false;
      
    } catch (err) {
      console.error('Error saving file:', err);
      if (process.env.NODE_ENV === 'development') {
        console.log('Save error details:', { 
          hasFileHandle: !!fileHandle,
          error: err.message,
          fileSystemAccessAvailable: isFileSystemAccessAPIAvailable()
        });
      }
      return false;
    }
  }, [events, fileHandle, isClient]);
  
  // Auto-save effect
  useEffect(() => {
    if (!isClient) return;
    
    const isFileSystemAccessAPIAvailable = () => {
      return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
    };
    
    // Only try to use file handle if FS API is available
    if (isFileSystemAccessAPIAvailable() && !fileHandle) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-save disabled: No file handle');
      }
      return;
    }
    
    let isMounted = true;
    
    const autoSave = async () => {
      if (!isMounted) return;
      
      // For auto-save, we don't want to trigger downloads
      const success = await handleSave(false);
      
      // Only try to get a new file handle if FS API is available and this was a file handle error
      if (!success && isMounted && isFileSystemAccessAPIAvailable()) {
        try {
          const newHandle = await window.showSaveFilePicker({
            suggestedName: 'calendar.json',
            types: [{
              description: 'JSON File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          if (newHandle && isMounted) {
            setFileHandle(newHandle);
            // Try saving again with the new handle
            await handleSave();
          }
        } catch (err) {
          console.error('Failed to get new file handle:', err);
        }
      }
    };
    
    const intervalId = setInterval(autoSave, 30000);
    
    // Initial save when component mounts
    autoSave();
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fileHandle, handleSave]);

  const handleNewCalendar = useCallback(async () => {
    try {
      const newFileHandle = await saveToFile({ events: {} });
      setFileHandle(newFileHandle);
      setEvents({});
      setShowSplash(false);
    } catch (err) {
      console.error('Error creating new calendar:', err);
      alert('Could not create a new calendar file. Please try again.');
    }
  }, []);

  const handleOpenCalendar = useCallback(async () => {
    try {
      const { data, handle } = await openFromFile();
      setFileHandle(handle);
      setEvents(data.events || {});
      setLastSaved(new Date());
      setShowSplash(false);
    } catch (err) {
      console.error('Error opening calendar:', err);
      if (err.name !== 'AbortError') {
        alert('Could not open the calendar file. Please try again.');
      }
    }
  }, []);

  // Render logic
  if (!isClient) {
    return <div className="loading">Loading calendar...</div>;
  }

  if (showSplash) {
    return (
      <SplashScreen 
        onNewCalendar={handleNewCalendar}
        onOpenCalendar={handleOpenCalendar}
      />
    );
  }

  return (
    <CalendarView
      months={months}
      events={events}
      colorPickers={colorPickers}
      dayNames={dayNames}
      onAddMonth={addMonth}
      onSave={handleSave}
      onToggleColorPicker={toggleColorPicker}
      onAddEvent={handleAddEvent}
      onEventChange={handleEventChange}
      onClearAllEvents={clearAllEvents}
      lastSaved={lastSaved}
    />
  );
};

export default Timeline;
