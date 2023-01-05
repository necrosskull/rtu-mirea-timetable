import { type NextPage } from "next";
import Head from "next/head";

import { CalendarIcon, MapIcon, UserIcon } from "@heroicons/react/20/solid";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import axios from "axios";
import { useQuery } from "react-query";
import { paths } from "../api/schemas/openapi";
import { components } from "../api/schemas/openapi";
import { getWeek, getWeekByDate } from "../utils";

import { Menu, Transition } from "@headlessui/react";
import { useRouter } from "next/router";

const generateDays = (
  currentDate = new Date(),
  monthToDisplay: number,
  yearToDisplay: number
) => {
  const days = [];

  const firstDayOfMonth = new Date(yearToDisplay, monthToDisplay - 1, 1);
  const lastDayOfMonth = new Date(yearToDisplay, monthToDisplay, 0);

  let lastDayOfPreviousMonth = new Date(yearToDisplay, monthToDisplay - 1, 0);

  if (monthToDisplay === 1) {
    lastDayOfPreviousMonth = new Date(yearToDisplay - 1, 12, 0);
  }

  const daysInMonth = lastDayOfMonth.getDate();
  const daysInLastMonth = lastDayOfPreviousMonth.getDate();

  const dayOfWeek = firstDayOfMonth.getDay() - 1;

  let daysBefore = dayOfWeek;

  // Если первый день месяца - воскресенье, то нужно отобразить 6 дней предыдущего месяца
  if (dayOfWeek === -1) {
    daysBefore = 6;
  }

  // Начало предыдущего месяца
  for (let i = daysBefore; i > 0; i--) {
    days.push({
      date: new Date(
        yearToDisplay,
        monthToDisplay - 2,
        daysInLastMonth - i + 1
      ),
      isCurrentMonth: false,
    });
  }

  // Текущий месяц
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(yearToDisplay, monthToDisplay - 1, i),
      isCurrentMonth: true,
      isToday:
        currentDate.getFullYear() === yearToDisplay &&
        currentDate.getMonth() === monthToDisplay - 1 &&
        currentDate.getDate() === i,
      isSelected:
        currentDate.getFullYear() === yearToDisplay &&
        currentDate.getMonth() === monthToDisplay - 1 &&
        currentDate.getDate() === i,
    });
  }

  // Конец текущего месяца
  const daysAfter = 7 - (days.length % 7);

  for (let i = 1; i <= daysAfter; i++) {
    days.push({
      date: new Date(yearToDisplay, monthToDisplay, i),
    });
  }

  return days;
};

function classNames(...classes: unknown[]) {
  return classes.filter(Boolean).join(" ");
}

const searchTeacherSchedule = async (name: string) => {
  const url = "/api/teachers/search/{name}";

  //   set axios base url as http://localhost
  axios.defaults.baseURL = "http://localhost";

  const response = await axios.get(url.replace("{name}", name));

  const data = response.data;

  //   если больше одного препода, то выбираем первого
  return data[0];
};

const joinLessonsByGroups = (
  lessons: components["schemas"]["Teacher"]["lessons"]
) => {
  // Найти все lesson с одинаковым названием, weekday и calls.time_start. Оставить только первое вхождение и добавить в него в group.name все остальные lesson.group.name

  const newLessons: components["schemas"]["Teacher"]["lessons"] = [];

  lessons.forEach((lesson) => {
    const newLesson = newLessons.find((newLesson) => {
      return (
        newLesson.name === lesson.name &&
        newLesson.weekday === lesson.weekday &&
        newLesson.calls.time_start === lesson.calls.time_start
      );
    });

    if (newLesson) {
      if (newLesson.group.name.indexOf(lesson.group.name) === -1) {
        newLesson.group.name += `, ${lesson.group.name}`;
      }
    } else {
      newLessons.push(lesson);
    }
  });

  return newLessons;
};

const getLessonsForDate = (
  lessons:
    | components["schemas"]["Group"]["lessons"]
    | components["schemas"]["Teacher"]["lessons"],
  date: Date
) => {
  const week = getWeekByDate(date);
  const day = date.getDay() - 1;

  if (day === -1) {
    return [];
  }

  const newLessons = lessons.filter((lesson) => {
    return lesson.weeks.includes(week) && lesson.weekday === day;
  });

  console.log("NEW LESSONS", newLessons);

  return newLessons;
};

type Days = {
  date: Date;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
}[];

const Teacher: NextPage = () => {
  //  Получить "name" преподавателя из URL
  const { name } = useRouter().query as { name: string };
  console.log("NAME", name);
  const container = useRef(null);
  const containerNav = useRef(null);
  const containerOffset = useRef(null);

  const currentDate = new Date();
  const [monthToDisplay, setMonthToDisplay] = useState(currentDate.getMonth());
  const [yearToDisplay, setYearToDisplay] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [days, setDays] = useState<Days>(
    generateDays(
      currentDate,
      currentDate.getMonth() + 1,
      currentDate.getFullYear()
    )
  );

  useEffect(() => {
    setDays(
      days.map((d) => {
        if (
          d.date?.getDate() === selectedDate.getDate() &&
          d.date?.getMonth() === selectedDate.getMonth() &&
          d.date?.getFullYear() === selectedDate.getFullYear()
        ) {
          return { ...d, isSelected: true };
        }
        return { ...d, isSelected: false };
      })
    );
  }, [selectedDate]);

  const [teacher, setTeacher] = useState<
    components["schemas"]["Teacher"] | null
  >(null);

  console.log("TEACHER", name);
  useQuery("teacher", () => searchTeacherSchedule(name), {
    onSuccess: (data) => {
      setTeacher(data);
    },
  });

  useEffect(() => {
    setDays(generateDays(currentDate, monthToDisplay + 1, yearToDisplay));
  }, [monthToDisplay, yearToDisplay]);

  const getWeekDaysByDate = (date: Date) => {
    const days = [];

    for (let i = 1; i <= 7; i++) {
      const day = new Date(date);
      day.setDate(day.getDate() - day.getDay() + i);
      days.push(day);
    }

    return days;
  };

  return (
    <>
      <Head>
        <title>Расписание преподавателя {name}</title>
        <meta name="description" content="Расписание преподавателя" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen flex-col">
        <h2 className="text-lg font-semibold text-gray-900">
          Расписание преподавателя {name}
        </h2>
        <div className="flex flex-1 flex-col">
          {/* Header with date */}
          <header className="relative z-20 flex flex-none items-center justify-between border-b border-gray-200 py-4 px-6">
            <div>
              <h1 className="text-lg font-semibold leading-6 text-gray-900">
                <time className="sm:hidden" dateTime="2022-01-22">
                  {/* by selected date */}
                  {selectedDate.toLocaleDateString("ru-RU", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <time dateTime="2022-01-22" className="hidden sm:inline">
                  {selectedDate.toLocaleDateString("ru-RU", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {selectedDate.toLocaleDateString("ru-RU", {
                  weekday: "long",
                })}{" "}
                {getWeekByDate(selectedDate)} неделя
              </p>
            </div>
            {/* <div className="flex items-center">
              <div className="flex items-center rounded-md shadow-sm md:items-stretch">
                <button
                  type="button"
                  className="flex items-center justify-center rounded-l-md border border-r-0 border-gray-300 bg-white py-2 pl-3 pr-4 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:px-2 md:hover:bg-gray-50"
                >
                  <span className="sr-only">Previous month</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hidden border-t border-b border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:relative md:block"
                >
                  Сегодня
                </button>
                <span className="relative -mx-px h-5 w-px bg-gray-300 md:hidden" />
                <button
                  type="button"
                  className="flex items-center justify-center rounded-r-md border border-l-0 border-gray-300 bg-white py-2 pl-4 pr-3 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:px-2 md:hover:bg-gray-50"
                >
                  <span className="sr-only">Next month</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="hidden md:ml-4 md:flex md:items-center">
                <Menu as="div" className="relative">
                  <Menu.Button
                    type="button"
                    className="flex items-center rounded-md border border-gray-300 bg-white py-2 pl-3 pr-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Просмотр дня
                    <ChevronDownIcon
                      className="ml-2 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-3 w-36 origin-top-right overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active
                                  ? "bg-gray-100 text-gray-900"
                                  : "text-gray-700",
                                "block px-4 py-2 text-sm"
                              )}
                            >
                              Day view
                            </a>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active
                                  ? "bg-gray-100 text-gray-900"
                                  : "text-gray-700",
                                "block px-4 py-2 text-sm"
                              )}
                            >
                              Week view
                            </a>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active
                                  ? "bg-gray-100 text-gray-900"
                                  : "text-gray-700",
                                "block px-4 py-2 text-sm"
                              )}
                            >
                              Month view
                            </a>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active
                                  ? "bg-gray-100 text-gray-900"
                                  : "text-gray-700",
                                "block px-4 py-2 text-sm"
                              )}
                            >
                              Year view
                            </a>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
              <Menu as="div" className="relative ml-6 md:hidden">
                <Menu.Button className="-mx-2 flex items-center rounded-full border border-transparent p-2 text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Открыть меню</span>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    aria-hidden="true"
                    role="img"
                    id="footer-sample-full"
                    width="1em"
                    height="1em"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M16 12a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2Z"
                    ></path>
                  </svg>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-3 w-36 origin-top-right divide-y divide-gray-100 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            Create event
                          </a>
                        )}
                      </Menu.Item>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            Экспорт в календарь
                          </a>
                        )}
                      </Menu.Item>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            День
                          </a>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            Неделя
                          </a>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            Месяц
                          </a>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="#"
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            Год
                          </a>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div> */}
          </header>
          <div className="flex flex-auto overflow-hidden bg-white">
            <div
              ref={container}
              className="flex flex-auto flex-col overflow-auto"
            >
              <div
                ref={containerNav}
                className="sticky top-0 z-10 grid flex-none grid-cols-7 bg-white text-xs text-gray-500 shadow ring-1 ring-black ring-opacity-5 md:hidden"
              >
                {getWeekDaysByDate(selectedDate).map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    className={classNames(
                      "flex flex-col items-center pt-3 pb-1.5",
                      selectedDate.getDate() === day.getDate()
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span>
                      {day.toLocaleString("ru", { weekday: "short" })}
                    </span>
                    <span className="mt-3 flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-gray-900">
                      {day.getDate()}
                    </span>
                  </button>
                ))}
              </div>
              <ol className="mt-4 divide-y divide-gray-100 text-sm leading-6 lg:col-span-7 xl:col-span-8">
                {/* if teacher, then map it lessons */}
                {teacher &&
                  joinLessonsByGroups(
                    getLessonsForDate(teacher.lessons, selectedDate)
                  ).map((lesson, index) => (
                    <li
                      key={index}
                      className="relative flex space-x-6 py-6 xl:static"
                    >
                      <div className="flex-auto">
                        <h3 className="pr-10 font-semibold text-gray-900 xl:pr-0">
                          {lesson.discipline.name}
                        </h3>
                        <dl className="mt-2 flex flex-col text-gray-500 xl:flex-row">
                          <div className="flex items-start space-x-3">
                            <dt className="mt-0.5">
                              <span className="sr-only">Date</span>
                              <CalendarIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </dt>
                            <dd>
                              <time dateTime={lesson.datetime}>
                                {lesson.calls.time_start.slice(0, 5)} -{" "}
                                {lesson.calls.time_end.slice(0, 5)}
                              </time>
                            </dd>
                          </div>
                          <div className="mt-2 flex items-start space-x-3 xl:mt-0 xl:ml-3.5 xl:border-l xl:border-gray-400 xl:border-opacity-50 xl:pl-3.5">
                            <dt className="mt-0.5">
                              <span className="sr-only">Location</span>
                              <MapIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </dt>
                            <dd>{lesson.room?.name}</dd>
                          </div>
                          {/* Список групп */}
                          <div className="mt-2 flex items-start space-x-3 xl:mt-0 xl:ml-3.5 xl:border-l xl:border-gray-400 xl:border-opacity-50 xl:pl-3.5">
                            <dt className="mt-0.5">
                              <span className="sr-only">Groups</span>
                              <UserIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </dt>
                            <dd>{lesson.group.name}</dd>
                          </div>
                        </dl>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
            <div className="hidden w-1/2 max-w-md flex-none border-l border-gray-100 py-10 px-8 md:block">
              <div className="flex items-center text-center text-gray-900">
                <button
                  type="button"
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
                  onClick={() => {
                    if (monthToDisplay === 0) {
                      setMonthToDisplay(11);
                      setYearToDisplay(yearToDisplay - 1);
                    } else {
                      setMonthToDisplay(monthToDisplay - 1);
                    }
                  }}
                >
                  <span className="sr-only">Предыдущий месяц</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="flex-auto font-semibold">
                  {new Date(yearToDisplay, monthToDisplay)
                    .toLocaleString("ru", {
                      month: "long",
                      year: "numeric",
                    })
                    .charAt(0)
                    .toUpperCase() +
                    new Date(yearToDisplay, monthToDisplay)
                      .toLocaleString("ru", {
                        month: "long",
                        year: "numeric",
                      })
                      .slice(1)}
                </div>
                <button
                  type="button"
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
                  onClick={() => {
                    if (monthToDisplay === 11) {
                      setMonthToDisplay(0);
                      setYearToDisplay(yearToDisplay + 1);
                    } else {
                      setMonthToDisplay(monthToDisplay + 1);
                    }
                  }}
                >
                  <span className="sr-only">Следующий месяц</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-7 text-center text-xs leading-6 text-gray-500">
                <div>ПН</div>
                <div>ВТ</div>
                <div>СР</div>
                <div>ЧТ</div>
                <div>ПТ</div>
                <div>СБ</div>
                <div>ВС</div>
              </div>
              <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-gray-200 text-sm shadow ring-1 ring-gray-200">
                {days.map((day, dayIdx) => (
                  <button
                    key={day.date}
                    type="button"
                    className={classNames(
                      "py-1.5 hover:bg-gray-100 focus:z-10",
                      day.isCurrentMonth ? "bg-white" : "bg-gray-50",
                      (day.isSelected || day.isToday) && "font-semibold",
                      day.isSelected && "text-white",
                      !day.isSelected &&
                        day.isCurrentMonth &&
                        !day.isToday &&
                        "text-gray-900",
                      !day.isSelected &&
                        !day.isCurrentMonth &&
                        !day.isToday &&
                        "text-gray-400",
                      day.isToday && !day.isSelected && "text-indigo-600",
                      dayIdx === 0 && "rounded-tl-lg",
                      dayIdx === 6 && "rounded-tr-lg",
                      dayIdx === days.length - 7 && "rounded-bl-lg",
                      dayIdx === days.length - 1 && "rounded-br-lg"
                    )}
                    onClick={() => {
                      setSelectedDate(day.date);
                    }}
                  >
                    <time
                      dateTime={day.date}
                      className={classNames(
                        "mx-auto flex h-7 w-7 items-center justify-center rounded-full",
                        day.isSelected && day.isToday && "bg-indigo-600",
                        day.isSelected && !day.isToday && "bg-gray-900"
                      )}
                    >
                      {day.date?.getDate()}
                    </time>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Teacher;