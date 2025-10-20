export type RadarFilters = {
  year: number;
  classes: string[];
  bimesters: number[];
  subject?: string;
  type?: string;
  groupBy: 'student' | 'class' | 'activity';
  compare?: {
    A?: string[];
    B?: string[];
  };
};

export type RadarAvatar = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials: string;
  classId?: string | null;
};

export type RadarStudent = RadarAvatar & {
  metrics?: {
    avg?: number;
    delta?: number;
    sparkline?: number[];
    consistency?: number;
  };
};

export type RadarClass = {
  id: string;
  name: string;
  color?: string | null;
  subject?: string | null;
  year?: number | null;
};

export type RadarActivity = {
  id: string;
  title: string;
  dateISO?: string | null;
  type?: string | null;
  classId?: string | null;
};

export type RadarGrade = {
  id: string;
  studentId: string;
  activityId: string;
  classId?: string | null;
  value: number;
  weight?: number | null;
  impact?: number | null;
};

export type RadarApprovalSlice = {
  pass: number;
  risk: number;
  none: number;
};

export type RadarKpis = {
  avg: number;
  passBim: number;
  passYear: number;
  avgSparkline?: number[];
  passBimDelta?: number;
  passYearDelta?: number;
};

export type RadarTimeseriesPoint = {
  id: string;
  dateISO: string;
  value: number;
  comparative?: number | null;
  type?: string | null;
};

export type RadarDistributionPoint = {
  id: string;
  groupId: string;
  value: number;
  studentId?: string | null;
};

export type RadarDataset = {
  students: RadarStudent[];
  classes: RadarClass[];
  activities: RadarActivity[];
  grades: RadarGrade[];
  approvals: {
    bim: RadarApprovalSlice;
    year: RadarApprovalSlice;
  };
  kpis: RadarKpis;
  timeseries: RadarTimeseriesPoint[];
  distributions: RadarDistributionPoint[];
};

export type RadarCompareSlot = 'A' | 'B';

export type RadarCompareItem = {
  id: string;
  label: string;
  kind: 'student' | 'class' | 'activity';
};

export type RadarViewData = {
  dataset: RadarDataset | null;
  filters: RadarFilters;
  compare: Required<RadarFilters>['compare'];
};
