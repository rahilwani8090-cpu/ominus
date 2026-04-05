/**
 * Calendar Service - Real Google Calendar integration
 * Create events, manage schedules, detect conflicts
 * 
 * REAL Google Calendar - not fake
 */

import { google } from 'googleapis';

class CalendarService {
  constructor() {
    this.calendar = null;
    this.auth = null;
    this.initializeCalendar();
  }

  /**
   * Initialize Google Calendar API with OAuth2
   */
  async initializeCalendar() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      if (process.env.GOOGLE_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
      }

      this.auth = oauth2Client;
      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      console.log('✅ Google Calendar API initialized');
    } catch (error) {
      console.warn('⚠️  Calendar API initialization deferred:', error.message);
    }
  }

  /**
   * Create event in Google Calendar (REAL)
   */
  async createEvent(eventData) {
    if (!this.calendar) {
      throw new Error('Calendar API not configured');
    }

    try {
      const {
        title,
        description = '',
        startTime,
        endTime,
        attendees = [],
        location = '',
        reminders = [{ method: 'email', minutes: 30 }],
        calendarId = 'primary'
      } = eventData;

      // Check for conflicts first
      const conflicts = await this.findConflicts(startTime, endTime, calendarId);
      if (conflicts.length > 0) {
        console.warn('⚠️  Scheduling conflicts detected:', conflicts);
      }

      const event = {
        summary: title,
        description,
        start: {
          dateTime: startTime instanceof Date ? startTime.toISOString() : startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime instanceof Date ? endTime.toISOString() : endTime,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({ email })),
        location,
        reminders: {
          useDefault: false,
          overrides: reminders
        }
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: 'all'
      });

      return {
        id: response.data.id,
        eventUrl: response.data.htmlLink,
        title: response.data.summary,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        attendees: response.data.attendees?.length || 0,
        conflicts: conflicts.length > 0 ? conflicts : null
      };
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Find scheduling conflicts
   */
  async findConflicts(startTime, endTime, calendarId = 'primary') {
    try {
      const start = startTime instanceof Date ? startTime.toISOString() : startTime;
      const end = endTime instanceof Date ? endTime.toISOString() : endTime;

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: start,
        timeMax: end,
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const conflicts = response.data.items || [];
      return conflicts.map(event => ({
        title: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime
      }));
    } catch (error) {
      console.error(`Failed to find conflicts: ${error.message}`);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(maxResults = 10, calendarId = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar API not configured');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      return {
        events: events.map(event => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          location: event.location,
          attendees: event.attendees?.length || 0,
          status: event.status
        })),
        total: events.length
      };
    } catch (error) {
      throw new Error(`Failed to get upcoming events: ${error.message}`);
    }
  }

  /**
   * Update event
   */
  async updateEvent(calendarId, eventId, updates) {
    try {
      // Get existing event
      const event = await this.calendar.events.get({
        calendarId,
        eventId
      });

      // Apply updates
      const updatedEvent = {
        ...event.data,
        summary: updates.title || event.data.summary,
        description: updates.description || event.data.description,
        start: updates.startTime ? { dateTime: updates.startTime } : event.data.start,
        end: updates.endTime ? { dateTime: updates.endTime } : event.data.end,
        location: updates.location || event.data.location
      };

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent,
        sendUpdates: 'all'
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        updated: true
      };
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(calendarId, eventId) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all'
      });

      return { success: true, deleted: eventId };
    } catch (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get available time slots for a meeting
   */
  async findAvailableSlots(duration = 60, daysAhead = 7, calendarId = 'primary') {
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const availableSlots = [];

      // Find free slots between 9 AM and 5 PM
      for (let d = new Date(now); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(9, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(17, 0, 0, 0);

        // Check each hour
        for (let hour = 9; hour < 17; hour++) {
          const slotStart = new Date(d);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

          // Check if slot conflicts with any event
          const hasConflict = events.some(
            event =>
              new Date(event.start.dateTime) < slotEnd &&
              new Date(event.end.dateTime) > slotStart
          );

          if (!hasConflict && slotStart > now) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString()
            });
          }
        }
      }

      return {
        duration,
        daysAhead,
        slots: availableSlots.slice(0, 20)
      };
    } catch (error) {
      throw new Error(`Failed to find available slots: ${error.message}`);
    }
  }

  /**
   * Get calendar list
   */
  async getCalendars() {
    try {
      const response = await this.calendar.calendarList.list();

      return {
        calendars: (response.data.items || []).map(cal => ({
          id: cal.id,
          name: cal.summary,
          timezone: cal.timeZone,
          primary: cal.primary
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get calendars: ${error.message}`);
    }
  }

  /**
   * Add attendees to event
   */
  async addAttendees(calendarId, eventId, attendeeEmails) {
    try {
      const event = await this.calendar.events.get({
        calendarId,
        eventId
      });

      const existingAttendees = event.data.attendees || [];
      const newAttendees = attendeeEmails.map(email => ({ email }));

      const updatedEvent = {
        ...event.data,
        attendees: [...existingAttendees, ...newAttendees]
      };

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent,
        sendUpdates: 'all'
      });

      return {
        eventId: response.data.id,
        attendees: response.data.attendees?.length || 0
      };
    } catch (error) {
      throw new Error(`Failed to add attendees: ${error.message}`);
    }
  }

  /**
   * Set reminder for event
   */
  async setReminder(calendarId, eventId, minutesBefore, method = 'email') {
    try {
      const event = await this.calendar.events.get({
        calendarId,
        eventId
      });

      const updatedEvent = {
        ...event.data,
        reminders: {
          useDefault: false,
          overrides: [
            {
              method,
              minutes: minutesBefore
            }
          ]
        }
      };

      await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to set reminder: ${error.message}`);
    }
  }

  /**
   * Get calendar statistics
   */
  async getStats(calendarId = 'primary') {
    try {
      const today = new Date();
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: today.toISOString(),
        timeMax: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        showDeleted: false,
        singleEvents: true
      });

      const events = response.data.items || [];

      return {
        totalEvents: events.length,
        upcomingWeek: events.filter(
          e => new Date(e.start.dateTime) < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        ).length,
        withAttendees: events.filter(e => e.attendees && e.attendees.length > 0).length
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

export default new CalendarService();
