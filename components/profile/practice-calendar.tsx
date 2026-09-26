"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface SessionData {
  created_at: string;
  duration_seconds: number;
}

interface PracticeCalendarProps {
  practiceData: SessionData[];
}

type TimeRange = "week" | "month" | "year";

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function PracticeCalendar({ practiceData }: PracticeCalendarProps) {
  const [calendarView, setCalendarView] = useState<CalendarViewData | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("week");
  const [rangeStats, setRangeStats] = useState({
    totalTime: 0,
    sessionCount: 0,
    avgPerDay: 0,
  });
  const [groupedData, setGroupedData] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const dateMap = new Map<string, number>();

    practiceData.forEach((session) => {
      const sessionDate = new Date(session.created_at);
      const localDateStr = formatLocalDate(sessionDate);
      const currentSeconds = dateMap.get(localDateStr) || 0;
      dateMap.set(localDateStr, currentSeconds + session.duration_seconds);
    });

    setGroupedData(dateMap);
  }, [practiceData]);

  useEffect(() => {
    const today = new Date();

    let viewData: CalendarViewData;

    switch (selectedRange) {
      case "week":
        viewData = generateWeekView(today, groupedData);
        break;
      case "month":
        viewData = generateMonthView(today, groupedData);
        break;
      case "year":
        viewData = generateYearView(today, groupedData);
        break;
    }

    setCalendarView(viewData);
  }, [groupedData, selectedRange]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let dayCount = 0;

    switch (selectedRange) {
      case "week":
        startDate.setDate(today.getDate() - today.getDay());
        dayCount = 7;
        break;
      case "month":
        startDate.setDate(1);
        dayCount = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        break;
      case "year":
        startDate = new Date(today.getFullYear(), 0, 1);
        dayCount = 365 + (isLeapYear(today.getFullYear()) ? 1 : 0);
        break;
    }

    const startDateStr = formatLocalDate(startDate);
    const todayStr = formatLocalDate(today);

    let totalTime = 0;
    let sessionCount = 0;

    groupedData.forEach((seconds, dateStr) => {
      if (dateStr >= startDateStr && dateStr <= todayStr) {
        totalTime += seconds;
        if (seconds > 0) sessionCount++;
      }
    });

    const avgPerDay = dayCount > 0 ? totalTime / dayCount : 0;

    setRangeStats({ totalTime, sessionCount, avgPerDay });
  }, [groupedData, selectedRange]);

  const isLeapYear = (year: number) => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };

  const generateWeekView = (
    today: Date,
    practiceMap: Map<string, number>
  ): CalendarViewData => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const days: CalendarDay[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(date);
      const seconds = practiceMap.get(dateStr) || 0;

      days.push({
        date: dateStr,
        day: date.getDate(),
        dayName: dayNames[i],
        seconds,
        isEmpty: false,
      });
    }

    return {
      type: "week",
      data: days,
    };
  };

  const generateMonthView = (
    today: Date,
    practiceMap: Map<string, number>
  ): CalendarViewData => {
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const weeks: CalendarWeek[] = [];
    let currentWeek: CalendarDay[] = [];

    for (let j = 0; j < firstDayOfWeek; j++) {
      currentWeek.push({ isEmpty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatLocalDate(date);
      const seconds = practiceMap.get(dateStr) || 0;

      currentWeek.push({
        date: dateStr,
        day,
        seconds,
        isEmpty: false,
      });

      if (currentWeek.length === 7) {
        weeks.push({ days: currentWeek });
        currentWeek = [];
      }
    }

    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({ isEmpty: true });
    }
    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }

    return {
      type: "month",
      data: {
        name: today.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        weeks,
      },
    };
  };

  const generateYearView = (
    today: Date,
    practiceMap: Map<string, number>
  ): CalendarViewData => {
    const currentYear = today.getFullYear();

    const months: CalendarMonth[] = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, i, 1);
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();

      const weeks: CalendarWeek[] = [];
      let currentWeek: CalendarDay[] = [];

      for (let j = 0; j < firstDayOfWeek; j++) {
        currentWeek.push({ isEmpty: true });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatLocalDate(date);
        const seconds = practiceMap.get(dateStr) || 0;

        currentWeek.push({
          date: dateStr,
          day,
          seconds,
          isEmpty: false,
        });

        if (currentWeek.length === 7) {
          weeks.push({ days: currentWeek });
          currentWeek = [];
        }
      }

      while (currentWeek.length > 0 && currentWeek.length < 7) {
        currentWeek.push({ isEmpty: true });
      }
      if (currentWeek.length > 0) {
        weeks.push({ days: currentWeek });
      }

      months.push({
        name: monthDate.toLocaleDateString("en-US", { month: "short" }),
        year,
        weeks,
      });
    }

    return {
      type: "year",
      data: months,
    };
  };

  const getIntensityClass = (seconds: number) => {
    if (seconds === 0) return "bg-muted/30";
    if (seconds < 1800) return "bg-emerald-200";
    if (seconds < 3600) return "bg-emerald-300";
    if (seconds < 7200) return "bg-emerald-400";
    return "bg-emerald-500";
  };

  const formatTooltip = (date: string, seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (seconds === 0) return `${dateStr}: No practice`;
    if (hours > 0) {
      return `${dateStr}: ${hours}h ${minutes}m`;
    }
    return `${dateStr}: ${minutes}m`;
  };

  const tabClass = (tab: TimeRange) =>
    `px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${selectedRange === tab
      ? "bg-primary text-primary-foreground shadow-soft"
      : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  const renderWeekView = (days: CalendarDay[]) => (
    <div className="flex justify-center gap-2">
      {days.map((day, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            {day.dayName}
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold ${getIntensityClass(
              day.seconds || 0
            )}`}
            title={day.date ? formatTooltip(day.date, day.seconds || 0) : undefined}
          >
            {day.day}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMonthView = (monthData: { name: string; weeks: CalendarWeek[] }) => (
    <div>
      <h3 className="text-base font-semibold mb-4 text-center tracking-tight">{monthData.name}</h3>
      <div className="flex justify-center">
        <div>
          <div className="flex gap-2 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="w-10 h-7 text-xs font-medium text-muted-foreground flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {monthData.weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex gap-2">
                {week.days.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${day.isEmpty
                        ? "bg-transparent"
                        : getIntensityClass(day.seconds || 0)
                      }`}
                    title={
                      !day.isEmpty && day.date
                        ? formatTooltip(day.date, day.seconds || 0)
                        : undefined
                    }
                  >
                    {day.isEmpty ? "" : day.day}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderYearView = (months: CalendarMonth[]) => (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {months.map((month, monthIdx) => (
          <div key={`${month.name}-${month.year}-${monthIdx}`} className="flex-shrink-0">
            <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
              {month.name}
            </div>
            <div className="space-y-0.5">
              {month.weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex gap-0.5">
                  {week.days.map((day, dayIdx) => (
                    <div
                      key={`${monthIdx}-${weekIdx}-${dayIdx}`}
                      className={`w-3 h-3 rounded-sm ${day.isEmpty
                          ? "bg-transparent"
                          : getIntensityClass(day.seconds || 0)
                        }`}
                      title={
                        !day.isEmpty && day.date
                          ? formatTooltip(day.date, day.seconds || 0)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg tracking-tight">Practice Activity</CardTitle>

          {/* Time Range Selector */}
          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            <button onClick={() => setSelectedRange("week")} className={tabClass("week")}>
              Week
            </button>
            <button onClick={() => setSelectedRange("month")} className={tabClass("month")}>
              Month
            </button>
            <button onClick={() => setSelectedRange("year")} className={tabClass("year")}>
              Year
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats for selected range */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-xl">
          <div className="text-center">
            <div className="text-xl font-bold tracking-tight">{formatDuration(rangeStats.totalTime)}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold tracking-tight">{rangeStats.sessionCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Practice Days</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold tracking-tight">{formatDuration(Math.round(rangeStats.avgPerDay))}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Avg/Day</div>
          </div>
        </div>

        {/* Calendar View */}
        {calendarView && (
          <>
            {calendarView.type === "week" && renderWeekView(calendarView.data as CalendarDay[])}
            {calendarView.type === "month" && renderMonthView(calendarView.data as { name: string; weeks: CalendarWeek[] })}
            {calendarView.type === "year" && renderYearView(calendarView.data as CalendarMonth[])}
          </>
        )}

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-6 text-xs text-muted-foreground justify-center">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-emerald-200" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface CalendarViewData {
  type: "week" | "month" | "year";
  data: CalendarDay[] | { name: string; weeks: CalendarWeek[] } | CalendarMonth[];
}

interface CalendarMonth {
  name: string;
  year: number;
  weeks: CalendarWeek[];
}

interface CalendarWeek {
  days: CalendarDay[];
}

interface CalendarDay {
  date?: string;
  day?: number;
  dayName?: string;
  seconds?: number;
  isEmpty: boolean;
}
