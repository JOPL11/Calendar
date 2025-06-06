'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths } from 'date-fns';
import '../app/globals.css';
import SplashScreen from './SplashScreen';
import { saveToFile, openFromFile } from '../utils/fileHandlers';

const COLORS = [
  { name: 'red', value: '#ef4444' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'green', value: '#10b981' },
  { name: 'yellow', value: '#f59e0b' },
];

const EventEditor = ({ date, event, onSave, onClose }) => {
  const [title, setTitle] = useState(event?.text || '');
  const [content, setContent] = useState(event?.content || '');
  const [selectedColor, setSelectedColor] = useState(event?.color || 'blue');
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...event,
      text: title,
      content: content,
      color: selectedColor
    });
    onClose();
  };
  
  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  if (!event) return null;

  return (
    <div className="event-editor-overlay">
      <div ref={popupRef} className="event-editor">
        <div className="event-editor-header">
          <div 
            className="event-header-bg"
            style={{ 
              '--event-color': COLORS.find(c => c.name === selectedColor)?.value || '#3b82f6'
            }}
          >
            <div className="event-title-row">
              <h3>Edit Event - {format(date, 'MMMM d, yyyy')}</h3>
              <div 
                className="color-indicator"
                title={`Event color: ${selectedColor}`}
              >
                ✓
              </div>
            </div>
            <button onClick={onClose} className="close-button">×</button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="event-title-input"
              placeholder="Event title"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="event-content-input"
              placeholder="Event content (HTML supported)"
              rows={8}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Calendar View Component
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
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingDate, setEditingDate] = useState(null);

  const handleAddEventWithPopup = (date, color) => {
    const newEvent = {
      id: Date.now(),
      text: '',
      content: '',
      color
    };
    onAddEvent(date, color);
    setEditingEvent(newEvent);
    setEditingDate(date);
  };

  const handleSaveEvent = (updatedEvent) => {
    if (editingDate) {
      // Sanitize the content before saving
      const sanitizedEvent = {
        ...updatedEvent,
        content: DOMPurify.sanitize(updatedEvent.content, { 
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
          ALLOWED_ATTR: ['href', 'target', 'rel']
        })
      };
      
      // Update both text and content fields
      onEventChange(editingDate, sanitizedEvent.id, 'text', sanitizedEvent.text);
      onEventChange(editingDate, sanitizedEvent.id, 'content', sanitizedEvent.content);
      setEditingEvent(null);
      setEditingDate(null);
    }
  };
  const renderMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(date);
    
    // Get all days in the month as an array of dates
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      days.push(currentDate);
    }
    
    return days.map(currentDate => {
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
                          handleAddEventWithPopup(currentDate, color);
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
            {dayEvents.length > 0 ? (
              dayEvents.map(event => (
                <div key={event.id} className="timeline-event">
                  <input
                    type="text"
                    value={event.text}
                    onClick={() => handleEventClick(event, currentDate)}
                    onChange={(e) => onEventChange(currentDate, event.id, e.target.value)}
                    className={`event-input ${event.color || ''}`}
                    placeholder="Add event..."
                  />
                </div>
              ))
            ) : (
              <div className="no-events">No events for this day</div>
            )}
          </div>
        </div>
      );
    });
  };

  const handleEventClick = (event, date) => {
    // Open the editor when an event is clicked
    if (event) {
      setEditingEvent({...event});
      setEditingDate(date);
    }
  };

  return (
    <div className="timeline-container">
      {editingEvent && (
        <EventEditor
          date={editingDate}
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => {
            setEditingEvent(null);
            setEditingDate(null);
          }}
        />
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
  const [months, setMonths] = useState([new Date()]);
  const [events, setEvents] = useState({});
  const [colorPickers, setColorPickers] = useState({});
  const [isClient, setIsClient] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [fileHandle, setFileHandle] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Toggle color picker visibility for a specific date
  const toggleColorPicker = useCallback((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setColorPickers(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  }, []);
  
  // Memoized values
  const dayNames = useMemo(() => 
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    []
  );
  
  const sanitize = useMemo(() => {
    return typeof window !== 'undefined' ? DOMPurify(window) : { sanitize: html => html };
  }, []);
  
  // Effects
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Event handlers
  const handleEventClick = useCallback((event, date) => {
    // Open the editor when an event is clicked
    if (event) {
      setEditingEvent(JSON.parse(JSON.stringify(event))); // Deep clone the event
      setEditingDate(new Date(date)); // Ensure date is a proper Date object
    }
  }, []);

  const handleAddEvent = useCallback((date, color = null) => {
    if (!isClient) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    const newEventId = Date.now();
    const newEvent = { 
      id: newEventId, 
      text: 'New Event',
      content: '',
      color: color || 'blue' // Default to blue if no color provided
    };
    
    setEvents(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newEvent]
    }));
    
    // Open the editor for the new event
    setEditingEvent(newEvent);
    setEditingDate(date);
    
    setColorPickers(prev => ({
      ...prev,
      [dateKey]: false
    }));
    
    return newEventId;
  }, [isClient]);

  const handleEventChange = useCallback((date, eventId, field, value) => {
    if (!isClient) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Sanitize HTML content if the field is 'content'
    const sanitizedValue = field === 'content' 
      ? DOMPurify.sanitize(value, { 
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
          ALLOWED_ATTR: ['href', 'target', 'rel']
        })
      : value;
    
    setEvents(prev => {
      const updatedEvents = { ...prev };
      if (updatedEvents[dateKey]) {
        updatedEvents[dateKey] = updatedEvents[dateKey].map(event =>
          event.id === eventId ? { ...event, [field]: sanitizedValue } : event
        );
      }
      return updatedEvents;
    });
  }, [isClient]);
  
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
