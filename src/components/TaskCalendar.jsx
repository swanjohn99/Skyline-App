import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function CalendarEvent({ event }) {
  return <span className="calendar-event-label">{event.title}</span>;
}

export default function TaskCalendar({ events, onSelectEvent, onSelectSlot, onRangeChange }) {
  return (
    <div className="calendar-container" style={{ height: '70vh', minHeight: 480 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        style={{ height: '100%' }}
        selectable
        views={['month', 'week', 'agenda']}
        defaultView="month"
        tooltipAccessor={(event) => event.title}
        components={{ event: CalendarEvent }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onRangeChange={onRangeChange}
        eventPropGetter={(event) => ({
          className: event.resource?.is_completed ? 'calendar-event--completed' : 'calendar-event--open',
        })}
      />
    </div>
  );
}
