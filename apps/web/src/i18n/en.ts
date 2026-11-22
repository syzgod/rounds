/** Maps every string to `string` and keeps functions, so `de` must match `en` key for key. */
export type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends string
    ? string
    : { [K in keyof T]: Widen<T[K]> }

const messages = {
  common: {
    retry: "Retry",
    notRecorded: "Not recorded",
    undated: "Undated",
    until: (date: string): string => `until ${date}`,
    ageYears: (n: number): string => (n === 1 ? "1 year" : `${n} years`),
    ageShort: (n: number): string => `${n} y`,
  },
  language: {
    label: "Language",
    english: "English",
    german: "Deutsch",
  },
  app: {
    tagline: "Patient history at a glance",
    skipLink: "Skip to patient record",
    selectPatient: "Select a patient",
    selectPatientHint: "Choose a patient from the list to see their record.",
    keySearch: "search",
    keyMove: "move",
    keyOpen: "open",
    keyTheme: "theme",
  },
  theme: {
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
    toggle: "Toggle theme",
  },
  health: {
    connecting: "Connecting…",
    online: "Online",
    offline: "Offline",
  },
  directory: {
    navLabel: "Patient directory",
    title: "Patients",
    searchKey: "Search",
    searchLabel: "Search patients by name or MRN",
    searchPlaceholder: "Search by name or MRN…",
    loading: "Loading patients",
    loadError: "Couldn't load patients.",
    noDetails: "No details recorded",
    noMatch: (query: string): string => `No patients match “${query}”.`,
    count: (n: number): string => (n === 1 ? "1 patient" : `${n} patients`),
    countFiltered: (shown: number, total: number): string =>
      `${shown} of ${total} patients`,
  },
  patient: {
    loading: "Loading patient",
    loadError: "Couldn't load this patient.",
    notFound: "Patient not found",
    backToList: "Back to patient list",
    sex: "Sex",
    age: "Age",
    birthDate: "Date of birth",
    mrn: "MRN",
  },
  sex: {
    FEMALE: "Female",
    MALE: "Male",
    OTHER: "Other",
    UNKNOWN: "Unknown",
  },
  sexShort: {
    FEMALE: "F",
    MALE: "M",
    OTHER: "O",
    UNKNOWN: "U",
  },
  timeline: {
    title: "Timeline",
    loading: "Loading timeline",
    loadError: "Couldn't load the timeline.",
    empty: "No entries",
    filterLabel: "Filter timeline by type",
    filterAll: "All",
    entryCount: (n: number): string => (n === 1 ? "1 entry" : `${n} entries`),
    entryCountFiltered: (shown: number, total: number): string =>
      `${shown} of ${total} entries`,
    kind: {
      ENCOUNTER: "Encounter",
      CONDITION: "Diagnosis",
      OBSERVATION: "Result",
    },
    kindPlural: {
      ENCOUNTER: "Encounters",
      CONDITION: "Diagnoses",
      OBSERVATION: "Results",
    },
    noneOfKind: {
      ENCOUNTER: "No encounters for this patient",
      CONDITION: "No diagnoses for this patient",
      OBSERVATION: "No results for this patient",
    },
    flag: {
      HIGH: "High",
      LOW: "Low",
      ABNORMAL: "Abnormal",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      resolved: "Resolved",
      recurrence: "Recurrence",
      relapse: "Relapse",
      remission: "Remission",
      "in-progress": "In progress",
      planned: "Planned",
      arrived: "Arrived",
      cancelled: "Cancelled",
      "entered-in-error": "Entered in error",
      preliminary: "Preliminary",
      registered: "Registered",
      unknown: "Unknown",
    },
  },
  trends: {
    title: "Trends",
    loading: "Loading trends",
    loadError: "Couldn't load trends.",
    systolic: "Systolic",
    diastolic: "Diastolic",
    names: {
      "4548-4": "HbA1c",
      "85354-9": "Blood pressure",
      "29463-7": "Weight",
      "8302-2": "Height",
      "59408-5": "Oxygen saturation",
      "9279-1": "Respiratory rate",
      "8867-4": "Heart rate",
      "19935-6": "Peak flow",
      "72514-3": "Pain score",
    },
    summary: (
      title: string,
      count: number,
      from: string,
      to: string,
      latest: string,
      range: string
    ): string =>
      `${title}, ${count} values from ${from} to ${to}, latest ${latest}, range ${range}`,
  },
}

export type Messages = Widen<typeof messages>

export const en: Messages = messages
