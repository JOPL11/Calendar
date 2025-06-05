'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths } from 'date-fns';
import '../app/globals.css';
import SplashScreen from './Splashscreen';
import { saveToFile, openFromFile } from '../utils/fileHandlers';

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
  // Click outside handler for color picker
  useEffect(() => {
    if (Object.keys(colorPickers).length === 0) return;
    
    const handleClick = (e) => {
      const clickedElement = e.target;
      const dateElement = clickedElement.closest('.day');
      
      if (!dateElement) {
        // Clicked outside any day, close all pickers
        onToggleColorPicker();
        return;
      }
      
      const dateKey = Array.from(dateElement.querySelectorAll('[data-date]'))[0]?.dataset.date;
      if (!dateKey) return;
      
      const isColorPicker = clickedElement.closest('.color-picker');
      const isAddButton = clickedElement.closest('.add-event-btn');
      
      if (!isColorPicker && !isAddButton) {
        onToggleColorPicker();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [colorPickers, onToggleColorPicker]);

  const renderMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(date);
    const firstDayOfMonth = startOfMonth(date);
    const startingDay = getDay(firstDayOfMonth);
    
    const days = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="empty-day"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayEvents = events[dateKey] || [];
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;
      
      days.push(
        <div key={dateKey} className={`day ${isToday ? 'today' : ''}`} data-date={dateKey}>
          <div className="day-header">
            <span className="day-number">{day}</span>
            <button 
              onClick={() => onToggleColorPicker(currentDate)}
              className="add-event-btn"
              aria-label="Add event"
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
                    }}
                    aria-label={`Add ${color} event`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="events">
            {dayEvents.map(event => (
              <div key={event.id} className={`event ${event.color || ''}`}>
                <input
                  type="text"
                  value={event.text}
                  onChange={(e) => onEventChange(currentDate, event.id, e.target.value)}
                  className="event-input"
                  placeholder="Event..."
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <h2>Calendar</h2>
        <div className="actions">
          <button onClick={onSave} className="save-btn">
            Save
          </button>
          <button onClick={onClearAllEvents} className="clear-btn">
            Clear All
          </button>
          {lastSaved && (
            <span className="last-saved">
              Last saved: {format(lastSaved, 'MMM d, yyyy h:mm a')}
            </span>
          )}
        </div>
      </div>
      
      {months.map((month, index) => (
        <div key={month.toString()} className="month">
          <h3>{format(month, 'MMMM yyyy')}</h3>
          <div className="weekdays">
            {dayNames.map(day => (
              <div key={day} className="weekday">
                {day.substring(0, 3)}
              </div>
            ))}
          </div>
          <div className="days">
            {renderMonth(month)}
          </div>
          {index === months.length - 1 && (
            <button onClick={onAddMonth} className="add-month-btn">
              Add Next Month
            </button>
          )}
        </div>
      ))}
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
  const toggleColorPicker = useCallback((date) => {
    if (!isClient) return;
    
    const dateKey = date ? format(date, 'yyyy-MM-dd') : null;
    
    // If clicking the same date's button, toggle it
    if (dateKey && colorPickers[dateKey]) {
      setColorPickers({});
    } else {
      // Otherwise, open the clicked date's picker
      setColorPickers(dateKey ? { [dateKey]: true } : {});
    }
  }, [isClient, colorPickers]);

  const handleAddEvent = useCallback((date, color = null) => {
    if (!isClient) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    setEvents(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), { 
        id: Date.now(), 
        text: '',
        color: color || null
      }]
    }));
    
    setColorPickers(prev => ({
      ...prev,
      [dateKey]: false
    }));
  }, [isClient]);

  const handleEventChange = useCallback((date, eventId, newText) => {
    if (!isClient) return;
    
    const cleanText = sanitize.sanitize(newText, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    const dateKey = format(date, 'yyyy-MM-dd');
    setEvents(prev => {
      const updatedEvents = {
        ...prev,
        [dateKey]: (prev[dateKey] || []).map(event => 
          event.id === eventId ? { ...event, text: cleanText } : event
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

  const handleSave = useCallback(async () => {
    if (!fileHandle) return;
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify({ events }, null, 2));
      await writable.close();
      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving file:', err);
      alert('Could not save the calendar file. Please try again.');
    }
  }, [events, fileHandle]);
  
  // Auto-save effect
  useEffect(() => {
    if (!fileHandle) return;
    const interval = setInterval(handleSave, 30000);
    return () => clearInterval(interval);
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
