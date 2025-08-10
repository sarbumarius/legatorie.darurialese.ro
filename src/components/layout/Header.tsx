import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Timer, PauseCircle, PlayCircle, LogOut, Info, Calendar, FileText, CalendarDays, Clipboard, CheckCircle2, AlertCircle, Star, Menu, X, Moon, Sun, Plus, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PontajData, User, WorkHistoryItem } from "@/types/dashboard";

interface TaskUser {
  id: number;
  firstname: string;
  lastname: string;
}

interface TaskInitiator {
  id: number;
  admin: number;
  firstname: string;
  lastname: string;
  email: string;
  email_verified_at: string | null;
  avatar: string | null;
  telefon: string;
  sms_enabled: number;
  push_enabled: number;
  pontaj: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  id_company: number;
  player_id: string;
}

interface TaskCategory {
  id: number;
  categorie: string;
  parent: string | null;
  color: string;
  status_final: number;
  status_inceput: number;
  status_intermediar: number[] | Record<string, number> | null; // Array, object, or null
  tip: string;
  sablon: unknown[] | null; // Array or null
  id_company: number;
  created_at: string;
  updated_at: string;
  status_intermediar_names: string[];
}

interface Task {
  id: number;
  categorie: string;
  task: string;
  persoana: number[];
  initiator: number;
  status: string;
  notificari: string | null;
  created_at: string;
  updated_at: string;
  imagine: string | null;
  order_column: number | null;
  star: boolean;
  deadline: string | null;
  mentiune: string | null;
  url: string | null;
  tags: string[] | null; // Array or null
  meta: Record<string, unknown> | unknown[] | null; // Object, array, or null
  utilizatori: TaskUser[];
  initiatorel: TaskInitiator;
  categoriemare: TaskCategory;
}

interface TasksData {
  taskuri_primite: number;
  taskuri_trimise: number;
  taskuri_finalizate: number;
  ultimul_task: Task;
  ultimele_taskuri: Task[];
}

interface LeaveData {
  id: number;
  id_persoana: number;
  tip_concediu: string;
  data_inceput: string;
  data_sfarsit: string;
  zile_concediu: number;
  status: string;
  motiv: string;
  document: string | null;
  pontaj: {
    id: number;
    id_persoana: number;
    id_firma: number;
    nume: string;
    prenume: string;
    username: string;
    status: string;
    email: string;
    id_user: number | null;
    functie: string;
    last_login: string | null;
    poza: string;
    salariu: string;
    secret_santa: string | null;
    program_inceput_contract: number;
    program_sfarsit_contract: number;
    created_at: string;
    id_staff: number;
    updated_at: string;
  };
}

interface HeaderProps {
  user: User;
  pontajData: PontajData | null;
  timerRunning: boolean;
  timerSeconds: number;
  formatTime: (seconds: number) => string;
  onLogout: () => void;
  onTimerToggle: () => void;
  workHistory: WorkHistoryItem[];
  isLoadingWorkHistory: boolean;
  formatDate: (dateString: string) => string;
  isFromCache: boolean;
  isLoadingStatus: boolean;
}

export const Header = ({
  user,
  pontajData,
  timerRunning,
  timerSeconds,
  formatTime,
  onLogout,
  onTimerToggle,
  workHistory,
  isLoadingWorkHistory,
  formatDate,
  isFromCache,
  isLoadingStatus
}: HeaderProps) => {
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showWorkHistoryModal, setShowWorkHistoryModal] = useState(false);
  const [showROIModal, setShowROIModal] = useState(false);
  const [showConcediiModal, setShowConcediiModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [leaveData, setLeaveData] = useState<LeaveData[]>([]);
  const [isLoadingLeaveData, setIsLoadingLeaveData] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [tasksData, setTasksData] = useState<TasksData | null>(null);
  const [isLoadingTasksData, setIsLoadingTasksData] = useState(false);

  // Tasks modal tabs & received tasks state
  const [tasksActiveTab, setTasksActiveTab] = useState<'dashboard' | 'primite'>('dashboard');
  const [tasksPrimite, setTasksPrimite] = useState<any[]>([]);
  const [isLoadingTasksPrimite, setIsLoadingTasksPrimite] = useState(false);
  const [tasksPrimiteError, setTasksPrimiteError] = useState<string | null>(null);
  const [tasksPrimiteLoaded, setTasksPrimiteLoaded] = useState(false);

  // Theme state (default dark)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Desktop orders grid columns (2/3/4), default 3
  const [orderCols, setOrderCols] = useState<number>(3);

  const applyTheme = (t: 'dark' | 'light') => {
    try {
      setTheme(t);
      localStorage.setItem('theme', t);
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (t === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } catch (e) {
      // no-op
    }
  };

  // Initialize theme and order columns on mount (defaults: dark theme, 3 cols)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      applyTheme('light');
    } else {
      applyTheme('dark');
    }

    const savedCols = localStorage.getItem('desktopOrderCols');
    const parsed = savedCols ? parseInt(savedCols, 10) : 3;
    const valid = parsed === 2 || parsed === 3 || parsed === 4 ? parsed : 3;
    setOrderCols(valid);
  }, []);

  // Format date to YYYY-MM-DD for input fields
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Get today and tomorrow dates for defaults
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // State for leave request form
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(formatDateForInput(today));
  const [endDate, setEndDate] = useState<string>(formatDateForInput(tomorrow));
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Fetch leave data when modal is opened
  useEffect(() => {
    if (showConcediiModal) {
      fetchLeaveData();
    }
  }, [showConcediiModal]);

  // Fetch tasks data when modal is opened
  useEffect(() => {
    if (showTasksModal) {
      fetchTasksData();
    }
  }, [showTasksModal]);

  // Function to fetch tasks data from API
  const fetchTasksData = async () => {
    try {
      setIsLoadingTasksData(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://crm.actium.ro/api/info-dashboard/${user.id}`, {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : '', 
          'Accept': 'application/json' 
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks data');
      }

      const data = await response.json();
      setTasksData(data);
    } catch (error) {
      console.error('Error fetching tasks data:', error);
    } finally {
      setIsLoadingTasksData(false);
    }
  };

  // Fetch received tasks (Taskuri primite)
  const fetchTasksPrimite = async () => {
    try {
      setIsLoadingTasksPrimite(true);
      setTasksPrimiteError(null);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://crm.actium.ro/api/tasks-primite/${user.id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Eroare la încărcarea taskurilor primite');
      }
      const json = await response.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      setTasksPrimite(items);
      setTasksPrimiteLoaded(true);
    } catch (e) {
      console.error('Error fetching received tasks:', e);
      setTasksPrimiteError('A apărut o eroare la încărcarea taskurilor primite. Încercați din nou.');
    } finally {
      setIsLoadingTasksPrimite(false);
    }
  };

  // Function to fetch leave data from API
  const fetchLeaveData = async () => {
    try {
      setIsLoadingLeaveData(true);
      const response = await fetch('https://actium.ro/api/concedii');

      if (!response.ok) {
        throw new Error('Failed to fetch leave data');
      }

      const data = await response.json();

      // Sort data by start date (most recent first)
      const sortedData = [...data].sort((a, b) => 
        new Date(b.data_inceput).getTime() - new Date(a.data_inceput).getTime()
      );

      setLeaveData(sortedData);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setIsLoadingLeaveData(false);
    }
  };

  // Function to handle leave request submission
  const handleSubmitLeaveRequest = async () => {
    if (!leaveType || !startDate || !endDate) {
      alert('Vă rugăm să completați toate câmpurile obligatorii.');
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      alert('Data de sfârșit nu poate fi înainte de data de început.');
      return;
    }

    try {
      setIsSubmittingLeave(true);

      // Get user ID from localStorage
      const storedUserData = localStorage.getItem('userData');
      if (!storedUserData) {
        throw new Error('User data not found');
      }

      const userData = JSON.parse(storedUserData);
      const userId = userData.id;

      // Calculate number of days between start and end dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

      // Prepare request data
      const requestData = {
        id: 15, // Adding the required id field
        id_persoana: userId,
        tip_concediu: leaveType,
        data_inceput: startDate,
        data_sfarsit: endDate,
        zile_concediu: diffDays,
        motiv: leaveReason || ''
      };

      // Send request to API
      const token = localStorage.getItem('authToken');
      const response = await fetch('https://actium.ro/api/concedii', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit leave request');
      }

      // Reset form and refresh data
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setLeaveReason("");
      setShowLeaveForm(false);

      // Refresh leave data
      fetchLeaveData();

      // Show success message
      alert('Cererea de concediu a fost trimisă cu succes!');

    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert(`Eroare la trimiterea cererii: ${error.message}`);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Group work history items by date (just the date part, not time)
  const groupWorkHistoryByDate = () => {
    const grouped = {};

    workHistory.forEach(item => {
      // Extract just the date part (YYYY-MM-DD)
      const dateStart = new Date(item.data_inceput);
      const dateKey = `${dateStart.getFullYear()}-${String(dateStart.getMonth() + 1).padStart(2, '0')}-${String(dateStart.getDate()).padStart(2, '0')}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          items: [],
          totalMinutes: 0,
          expanded: false // For collapsible UI
        };
      }

      grouped[dateKey].items.push(item);
      grouped[dateKey].totalMinutes += item.minute;
    });

    // Convert to array and sort by date (most recent first)
    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const groupedWorkHistory = groupWorkHistoryByDate();

  // Calculate summary data
  const totalMinutes = workHistory.reduce((total, item) => total + item.minute, 0);
  const totalPenalizari = workHistory.filter(item => item.penalizare === "da").length;

  // Function to convert minutes to hours
  const minutesToHours = (minutes) => {
    return (minutes / 60).toFixed(2);
  };

  // Function to toggle expansion of a group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupExpansion = (dateKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Info toggle for Penalizări explanation in work history modal
  const [showPenInfo, setShowPenInfo] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Docked chat visibility from Content via global event
  const [chatDocked, setChatDocked] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<boolean>;
        setChatDocked(!!ce.detail);
      } catch (err) {}
    };
    window.addEventListener('chat-visibility-change', handler as EventListener);
    return () => window.removeEventListener('chat-visibility-change', handler as EventListener);
  }, []);

  return (
    <header className={`header-bg border-b border-border p-4 shadow-sm fixed top-0 left-0 right-0 z-50 ${chatDocked ? 'pr-[15vw]' : ''}`}>
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4">
          <img
              src="logo.svg"
              alt="Daruri Alese Logo"
              className="h-12 ml-4"
          />

          {/* Desktop view */}
          <div className="hidden md:flex ml-6 items-center gap-3 border border-gray-700 rounded-md px-3 py-1.5">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowWorkHistoryModal(true)}
            >
              <Avatar>
                <AvatarImage src={pontajData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} alt="Avatar" />
                <AvatarFallback>👤</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-gray-400">{pontajData?.functie || user.email}</div>
              </div>
              {/*<Calendar className="w-4 h-4 text-gray-400" />*/}
            </div>
            <div className="border-l border-gray-700 mx-2 h-8"></div>
            <Timer className="w-4 h-4 text-primary"   onClick={() => setShowInfoPopup(true)} />
            <span className="text-sm font-mono text-white"  onClick={() => setShowInfoPopup(true)}>{formatTime(timerSeconds)}</span>
            <Button
              variant={timerRunning ? "destructive" : "default"}
              size="sm"
              onClick={onTimerToggle}
              className="h-7 px-2"
            >
              {timerRunning ? <><PauseCircle className="w-4 h-4 mr-1" />Stop</> : <><PlayCircle className="w-4 h-4 mr-1" />Start</>}
            </Button>
            {/*<Button*/}
            {/*  variant="outline"*/}
            {/*  size="icon"*/}
            {/*  className="h-7 w-7"*/}
            {/*  onClick={() => setShowInfoPopup(true)}*/}
            {/*>*/}
            {/*  <Info className="w-4 h-4" />*/}
            {/*</Button>*/}
            <Button
              variant="outline"
              size="sm"
              className="h-7 ml-1 text-black dark:text-white"
              onClick={() => setShowROIModal(true)}
            >
              <FileText className="w-4 h-4 mr-1 text-black dark:text-white" />
              ROI
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 ml-1 text-black dark:text-white"
              onClick={() => setShowConcediiModal(true)}
            >
              <CalendarDays className="w-4 h-4 mr-1 text-black dark:text-white" />
              Concedii
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 ml-1 text-black dark:text-white"
              onClick={() => setShowTasksModal(true)}
            >
              <Clipboard className="w-4 h-4 mr-1 text-black dark:text-white" />
              Taskuri
            </Button>

            {/*{timerRunning && (*/}
            {/*  <div className="ml-3 flex items-center border-l border-gray-700 pl-3">*/}
            {/*    <table className="text-white text-xs">*/}
            {/*      <tbody>*/}
            {/*        <tr>*/}
            {/*          <td className="pr-4 text-center">*/}
            {/*            <div className="text-gray-400">Început program</div>*/}
            {/*            <div className="font-medium">08:00</div>*/}
            {/*          </td>*/}
            {/*          <td className="px-4 text-center border-l border-gray-700">*/}
            {/*            <div className="text-gray-400">Prima comandă la</div>*/}
            {/*            <div className="font-medium">08:15</div>*/}
            {/*          </td>*/}
            {/*          <td className="px-4 text-center border-l border-gray-700">*/}
            {/*            <div className="text-gray-400">Comenzi începute</div>*/}
            {/*            <div className="font-medium">12</div>*/}
            {/*          </td>*/}
            {/*          <td className="pl-4 text-center border-l border-gray-700">*/}
            {/*            <div className="text-gray-400">Comenzi trimise</div>*/}
            {/*            <div className="font-medium">8</div>*/}
            {/*          </td>*/}
            {/*        </tr>*/}
            {/*      </tbody>*/}
            {/*    </table>*/}
            {/*  </div>*/}
            {/*)}*/}
          </div>

          {/* Mobile view - compact header */}
          <div className="md:hidden flex items-center gap-2">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowWorkHistoryModal(true)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={pontajData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} alt="Avatar" />
                <AvatarFallback>👤</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4 text-primary" onClick={() => setShowInfoPopup(true)} />
              <span className="text-xs font-mono text-white" onClick={() => setShowInfoPopup(true)}>{formatTime(timerSeconds)}</span>
            </div>
            <Button
              variant={timerRunning ? "destructive" : "default"}
              size="sm"
              onClick={onTimerToggle}
              className="h-7 px-2 text-xs"
            >
              {timerRunning ? <PauseCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-2 text-black dark:text-white">
          {/* Cache status & refresh (replaces Activ/Oprit) */}
          <div className="hidden md:flex items-center mr-1">
            {isLoadingStatus ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" title="Se actualizează..."></div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 flex items-center gap-2"
                onClick={() => {
                  try {
                    window.dispatchEvent(new Event('manual-refresh'));
                  } catch (e) {}
                }}
                title="Actualizează status cache/live"
                aria-label="Actualizează cache"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="flex items-center gap-1 text-xs">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${isFromCache ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  {isFromCache ? 'Cache' : 'Live'}
                </span>
              </Button>
            )}
          </div>

          {/* Orders per row selector (desktop) */}
          <div className="hidden md:flex items-center gap-1 mr-1">
            {/*<span className="text-xs text-gray-300">Comenzi:</span>*/}
            <Select
              value={String(orderCols)}
              onValueChange={(val) => {
                const num = parseInt(val, 10);
                const valid = num === 2 || num === 3 || num === 4 ? num : 3;
                setOrderCols(valid);
                try {
                  localStorage.setItem('desktopOrderCols', String(valid));
                } catch (e) {}
                // Notify listeners (Content) to update immediately
                try {
                  // @ts-ignore - Custom event for cross-component notification
                  window.dispatchEvent(new CustomEvent('order-cols-change', { detail: valid }));
                } catch (e) {}
              }}
            >
              <SelectTrigger className="h-7 w-[120px] px-2 text-xs">
                <SelectValue placeholder="3 comenzi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 comenzi</SelectItem>
                <SelectItem value="3">3 comenzi</SelectItem>
                <SelectItem value="4">4 comenzi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme toggles - button group */}
          <div className="hidden md:inline-flex rounded-md overflow-hidden border border-border">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-9 p-0 rounded-none ${theme === 'dark' ? 'bg-secondary text-secondary-foreground' : 'text-white hover:bg-muted/30'}`}
              onClick={() => applyTheme('dark')}
              aria-label="Setează tema Dark"
              title="Dark"
            >
              <Moon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-9 p-0 rounded-none border-l border-border ${theme === 'light' ? 'bg-secondary text-secondary-foreground' : 'text-foreground/70 hover:bg-muted/30'}`}
              onClick={() => applyTheme('light')}
              aria-label="Setează tema Light"
              title="Light"
            >
              <Sun className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-white hover:text-black">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-2 bg-gray-900 rounded-md border border-gray-700 animate-in fade-in slide-in-from-top-5">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full flex flex-col items-center justify-center p-1"
              onClick={() => {
                setShowROIModal(true);
                setMobileMenuOpen(false);
              }}
            >
              <FileText className="w-4 h-4 mb-1" />
              <span className="text-xs">ROI</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full flex flex-col items-center justify-center p-1"
              onClick={() => {
                setShowConcediiModal(true);
                setMobileMenuOpen(false);
              }}
            >
              <CalendarDays className="w-4 h-4 mb-1" />
              <span className="text-xs">Concedii</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full flex flex-col items-center justify-center p-1"
              onClick={() => {
                setShowTasksModal(true);
                setMobileMenuOpen(false);
              }}
            >
              <Clipboard className="w-4 h-4 mb-1" />
              <span className="text-xs">Taskuri</span>
            </Button>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-white">{user.name}</div>
              <div className="text-xs text-gray-400">{pontajData?.functie || user.email}</div>
            </div>
          </div>
        </div>
      )}
      <Dialog open={showInfoPopup} onOpenChange={setShowInfoPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informații pontaj</DialogTitle>
            <DialogDescription>Sistemul de pontaj înregistrează timpul petrecut în aplicație.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timp înregistrat astăzi:</span>
                <span className="font-medium">{formatTime(timerSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={timerRunning ? "default" : "secondary"}>
                  {timerRunning ? "Activ" : "Oprit"}
                </Badge>
              </div>
              <div className="bg-muted/30 p-3 rounded-md text-sm space-y-2">
                {pontajData && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program:</span>
                    <span className="font-medium">{pontajData.program_inceput}:00 - {pontajData.program_sfarsit}:00</span>
                  </div>
                )}
                <p>Notă: Nu uita să oprești pontajul atunci când iei pauză sau la finalul zilei.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInfoPopup(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkHistoryModal} onOpenChange={setShowWorkHistoryModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Istoric pontaj luna curentă</DialogTitle>
            <DialogDescription>Activitatea înregistrată în luna curentă pentru {user.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingWorkHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : workHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu există înregistrări pentru luna curentă
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="bg-muted/20 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Total înregistrări</div>
                    <div className="text-lg font-bold">{workHistory.length}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Total ore</div>
                    <div className="text-lg font-bold">{minutesToHours(totalMinutes)}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-md relative">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <span>Penalizări</span>
                      <button
                        type="button"
                        className="p-0.5 rounded hover:bg-muted/40"
                        onClick={() => setShowPenInfo((v) => !v)}
                        aria-label="Informații penalizări"
                        title="Afișează explicația"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {showPenInfo && (
                      <div className="mb-2 text-[10px] leading-snug text-muted-foreground bg-muted/30 border border-border rounded px-2 py-1">
                        Acesta reprezintă orice înregistrare mai mică de 8 ore.
                      </div>
                    )}
                    <div className="text-lg font-bold">{totalPenalizari}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {groupedWorkHistory.map((group) => {
                    const isExpanded = expandedGroups[group.date] || false;
                    const dateObj = new Date(group.date);
                    const formattedDate = dateObj.toLocaleDateString('ro-RO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });

                    // Calculate effective hours (8 hours per day)
                    const effectiveHours = 8;

                    return (
                      <div key={group.date} className="border rounded-md overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer"
                          onClick={() => toggleGroupExpansion(group.date)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              ▶
                            </div>
                            <div className="font-medium capitalize">{formattedDate}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground mr-1">Ore:</span>
                              <span className="font-medium">{minutesToHours(group.totalMinutes)}</span>
                              <span className="text-muted-foreground mx-1">din</span>
                              <span className="font-medium">{effectiveHours}</span>
                            </div>
                            <Badge variant="outline" className="px-2">
                              {group.items.length} înregistrări
                            </Badge>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-muted/10">
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Data început</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Data sfârșit</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tip</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Ore</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Penalizare</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Suplimentare</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((item, index) => (
                                  <tr 
                                    key={item.id} 
                                    className={`border-t border-border hover:bg-muted/20 ${index % 2 === 0 ? 'bg-muted/5' : ''}`}
                                  >
                                    <td className="px-4 py-2 text-xs font-medium">{formatDate(item.data_inceput)}</td>
                                    <td className="px-4 py-2 text-xs font-medium">{formatDate(item.data_sfarsit)}</td>
                                    <td className="px-4 py-2 text-xs">
                                      <Badge variant={item.type === "stop" ? "destructive" : "default"} className="capitalize">
                                        {item.type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2 text-xs font-mono">{minutesToHours(item.minute)}</td>
                                    <td className="px-4 py-2 text-xs">
                                      {item.penalizare === "da" ? (
                                        <Badge variant="destructive" className="px-2 py-0.5">Da</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">Nu</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                      {item.suplimentare === "da" ? (
                                        <Badge variant="default" className="px-2 py-0.5">Da</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">Nu</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowWorkHistoryModal(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showROIModal} onOpenChange={setShowROIModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regulament de Ordine Interioară – Departamentul de Gravare (CO2 & Metal)</DialogTitle>
            <DialogDescription>Regulile și procedurile specifice pentru activitatea de gravare cu laser CO2 și laser pentru metale (fiber/galvo)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">1. Program de lucru & Pontaj</h3>
                <p className="text-sm text-muted-foreground">
                  Programul standard este de Luni – Vineri, între orele 08:00 – 17:00.
                </p>
                <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
                  <li>Pauza de masă este stabilită între 12:30 – 13:00 și se respectă întocmai.</li>
                  <li>Prezența este înregistrată prin aplicația de pontaj electronic, disponibilă pe dispozitive mobile sau desktop.</li>
                  <li>Pontajul este obligatoriu la începutul și sfârșitul programului.</li>
                  <li>Echipamentele de gravare pot fi pornite doar dacă pontajul este activ (integrare aplicație utilaje).</li>
                  <li>Lipsa pontajului echivalează cu absență nemotivată.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2. Sarcini & responsabilități</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
                  <li>Operarea gravatoarelor CO2 și laser pentru metale (fiber/galvo) conform comenzilor.</li>
                  <li>Pregătirea fișierelor conform specificațiilor din Aplicația Cloud – Gravare Daruri Alese.</li>
                  <li>Respectarea ordinii de execuție și a termenelor asumate.</li>
                  <li>Verificarea materialelor, focusului, parametrilor (putere, viteză, frecvență/puls, treceri, air assist) înainte de rulare.</li>
                  <li>Marcarea comenzilor ca finalizate în aplicație și atașarea fotografiilor/rapoartelor, dacă se solicită.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Mentenanță & întreținere</h3>
                <p className="text-sm text-muted-foreground">
                  Curățenie zilnică la începutul și sfârșitul turei (masă de lucru, zonă încărcare/descărcare, spațiu comun).
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Întreținere periodică a echipamentelor:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>CO2: curățare oglinzi/lentilă, verificare aliniere, air assist, chiller/temperatură; curățare tăvi/grătare de resturi; verificare ventilator/extractor.</li>
                  <li>Fiber/galvo (metale): verificare focalizare, colimație/scan head, integritatea fereastrei de protecție, funcționare exhaust.</li>
                  <li>Evidență în Registrul de Mentenanță (data, operația, persoana).</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Raportare imediată a oricărei defecțiuni/comportament anormal către responsabilul tehnic; oprire utilaj dacă există risc.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">4. Flux digital de lucru</h3>
                <p className="text-sm text-muted-foreground">
                  Comenzile se gestionează prin:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>Aplicația Cloud – Gravare Daruri Alese (vizualizare, status, atașamente).</li>
                  <li>Google Drive de producție (fișiere sursă, șabloane, documente tehnice).</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Interzis: modificarea/redenumirea/ștergerea fișierelor fără aprobare.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Naming standard fișiere: [ID Comandă]_[Client]_[Material]_[Versiune].
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Preflight obligatoriu înainte de gravare:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>Formate acceptate (ex.: PDF/X, AI, SVG, DXF), fonturi convertite în curbe, rezoluții potrivite pentru raster.</li>
                  <li>Validarea dimensiunilor și a poziționării în șablon.</li>
                  <li>Test pe eșantion/referință unde este cazul (metale/acoperiri noi).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">5. Materiale, consumabile & interdicții</h3>
                <p className="text-sm text-muted-foreground">
                  Materiale uzuale:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>lemn, PFL, MDF, plexiglas/acrilic, piele, sticlă (CO2)</li>
                  <li>inox, oțel, aluminiu eloxat, alamă, cupru (fiber/galvo)</li>
                  <li>materiale acoperite (lac/pulberi), etichete tehnice</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Consumabile: bandă termică, compuși de marcare (unde e cazul), alcool izopropilic, lavete fără scame, măști de protecție a suprafeței, mănuși.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Materiale strict interzise la CO2 (toxice/riscuri): PVC/vinil clorurat, policarbonat gros, ABS, fibră de carbon cu rășini, materiale necunoscute fără fișă tehnică. Lista completă se afișează lângă utilaj.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Materiale aduse de client: necesită aprobare și, la nevoie, test în prealabil; clientul confirmă asumarea riscurilor asupra aspectului final.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6. Sănătate & Securitate în muncă (SSM)</h3>
                <p className="text-sm text-muted-foreground">
                  Echipament individual de protecție (EIP) obligatoriu:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>ochelari certificați pentru lungimea de undă a utilajului folosit (CO2 ~10.6 μm; fiber ~1064 nm)</li>
                  <li>mănuși, mască/respirator unde impune fișa materialului</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Nu se lasă utilajul nesupravegheat în timpul gravării.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Ține air assist activ (unde e aplicabil), îndepărtează materiale inflamabile din zona de lucru.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Păstrează la îndemână stingător (ABC/CO2) și cunoaște oprirea de urgență.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Interzis consumul de alcool/substanțe interzise; interzis telefonul în timpul operării (exceptând urgențe).
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Respectă protocolul de evacuare și instrucțiunile SSM/PSI afișate.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">7. Calitate, trasabilitate & livrare</h3>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>Respectarea bibliotecii de parametri internați; orice abatere se documentează.</li>
                  <li>Control vizual post-proces (arderi, umbre, neuniformități, poziționare, adâncime/contrast la metale).</li>
                  <li>Curățare piesă (metode compatibile: IPA, apă+săpun, șervețele speciale) conform materialului.</li>
                  <li>Trasabilitate: fiecare job conține în aplicație parametrii folosiți, operatorul, timpul de rulare, nr. de bucăți, fotografie probă dacă e cerută.</li>
                  <li>Neconformitățile se marchează în Registrul de NC și se comunică coordonatorului (acțiuni corective/preventive).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">8. Concedii, învoiri & absențe</h3>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>Concediul de odihnă: conform contractului individual de muncă și legislației.</li>
                  <li>Solicitări de concediu: cu minim 5 zile lucrătoare înainte (aplicație internă / formular către superiorul direct).</li>
                  <li>Învoirile pentru urgențe: doar cu aprobarea coordonatorului, maxim 3 zile/an.</li>
                  <li>Concediu medical: adeverință în prima zi de revenire.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">9. Etică & comportament profesional</h3>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>Respect, colaborare și comunicare corectă cu colegii și conducerea.</li>
                  <li>Interzis: limbaj vulgar, comportament agresiv, hărțuire, utilizarea conturilor de muncă în scop personal.</li>
                  <li>Păstrarea confidențialității datelor clienților și a fișierelor de producție.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">10. Evaluare & feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Evaluări periodice pe baza:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                  <li>calității gravărilor;</li>
                  <li>respectării termenelor;</li>
                  <li>curățeniei și stării echipamentelor;</li>
                  <li>respectării SSM/PSI;</li>
                  <li>implicării și comunicării.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">11. Abateri & măsuri disciplinare</h3>
                <p className="text-sm text-muted-foreground">
                  Nerespectarea prezentului regulament, a instrucțiunilor SSM/PSI sau a dispozițiilor interne poate atrage: avertisment, reținere din salariu (unde permite legea/regulamentele interne) sau desfacerea contractului, conform Codului Muncii.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowROIModal(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showConcediiModal} 
        onOpenChange={(open) => {
          setShowConcediiModal(open);
          if (!open) {
            // Reset form when modal is closed
            setShowLeaveForm(false);
            setLeaveType("");
            setStartDate("");
            setEndDate("");
            setLeaveReason("");
          }
        }}>
        <DialogContent className="fixed right-0 top-0 left-auto h-screen max-h-screen translate-x-0 translate-y-0 rounded-none w-full sm:w-[520px] md:w-[720px] overflow-hidden p-0">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold">Concedii</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowLeaveForm(true)}
                  aria-label="Adaugă cerere de concediu"
                  title="Adaugă"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowConcediiModal(false)} aria-label="Închide">

              </Button>
            </div>
            <div className="text-xs text-muted-foreground">Situația concediilor pentru angajați</div>
          </div>

          {/* Body scrollable */}
          <div className="h-[calc(100vh-52px)] overflow-y-auto px-4 py-4">
            <div className="mt-2 w-full">
              {showLeaveForm && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Adaugă cerere de concediu</h3>
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Tip concediu</Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger id="leaveType">
                        <SelectValue placeholder="Selectează tipul de concediu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Odihnă">Concediu de odihnă</SelectItem>
                        <SelectItem value="Medical">Concediu medical</SelectItem>
                        <SelectItem value="Fără plată">Concediu fără plată</SelectItem>
                        <SelectItem value="Îngrijire copil">Concediu îngrijire copil</SelectItem>
                        <SelectItem value="Studii">Concediu de studii</SelectItem>
                        <SelectItem value="Eveniment familial">Eveniment familial</SelectItem>
                        <SelectItem value="Altele">Altele</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data început</Label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 rounded-md border border-gray-700 bg-black text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data sfârșit</Label>
                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 rounded-md border border-gray-700 bg-black text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leaveReason">Motiv</Label>
                    <Textarea
                      id="leaveReason"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Detaliază motivul concediului..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowLeaveForm(false);
                        setLeaveType("");
                        setStartDate("");
                        setEndDate("");
                        setLeaveReason("");
                      }}
                    >
                      Anulează
                    </Button>
                    <Button
                      disabled={!leaveType || !startDate || !endDate || isSubmittingLeave}
                      onClick={handleSubmitLeaveRequest}
                    >
                      {isSubmittingLeave ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Se procesează...
                        </>
                      ) : (
                        "Salvează"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="py-4">
              {isLoadingLeaveData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : leaveData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nu există concedii înregistrate
                </div>
              ) : (
                <div className="space-y-2">
                  {leaveData.map((leave) => {
                    // Get current date for comparison
                    const currentDate = new Date();
                    const startDate = new Date(leave.data_inceput);
                    const endDate = new Date(leave.data_sfarsit);

                    // Determine leave status
                    const isUpcoming = startDate > currentDate;
                    const isInProgress = startDate <= currentDate && endDate >= currentDate;
                    const isExpired = endDate < currentDate;

                    // Set status badge properties
                    let statusBadge = null;
                    if (isUpcoming) {
                      statusBadge = <Badge className="bg-blue-100 text-blue-800 border-blue-200">Urmează</Badge>;
                    } else if (isInProgress) {
                      statusBadge = <Badge className="bg-green-100 text-green-800 border-green-200">În desfășurare</Badge>;
                    } else if (isExpired) {
                      statusBadge = <Badge variant="outline" className="text-gray-500">Expirat</Badge>;
                    }

                    return (
                      <div 
                        key={leave.id} 
                        className={`border rounded-md p-2 ${
                          isUpcoming ? 'bg-gray-900 border-blue-200' : 
                          isInProgress ? 'bg-gray-900 border-green-200' : 
                          'bg-muted/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {leave.pontaj.nume} {leave.pontaj.prenume}
                            </div>
                            {statusBadge}
                          </div>
                          <Badge 
                            variant={leave.status === "approved" ? "success" : "secondary"}
                            className={leave.status === "approved" ? "bg-green-100 text-green-800 border-green-200" : ""}
                            size="sm"
                          >
                            {leave.status === "approved" ? "Aprobat" : leave.status}
                          </Badge>
                        </div>

                        <div className="mt-1 flex items-center text-xs text-muted-foreground">
                          <span>{leave.pontaj.functie}</span>
                          <span className="mx-1">•</span>
                          <span>{leave.tip_concediu}</span>
                          <span className="mx-1">•</span>
                          <span>{leave.zile_concediu} zile</span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <div className="flex items-center">
                            <span className="text-muted-foreground mr-1">De la:</span>
                            <span className="font-medium">{formatDate(leave.data_inceput)}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-muted-foreground mr-1">Până la:</span>
                            <span className="font-medium">{formatDate(leave.data_sfarsit)}</span>
                          </div>
                        </div>

                        {leave.motiv && (
                          <div className="mt-1 text-xs">
                            <span className="text-muted-foreground mr-1">Motiv:</span>
                            <span>{leave.motiv}</span>
                          </div>
                        )}

                        {leave.document && (
                          <div className="mt-1">
                            <a 
                              href={`https://actium.ro/uploads/documente-concedii/${leave.document}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              Document atașat
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tasks Modal */}
      <Dialog 
        open={showTasksModal} 
        onOpenChange={(open) => {
          setShowTasksModal(open);
          if (open) {
            fetchTasksData();
            if (tasksActiveTab === 'primite') {
              fetchTasksPrimite();
            }
          }
        }}
      >
        <DialogContent className="fixed right-0 top-0 left-auto h-screen max-h-screen translate-x-0 translate-y-0 rounded-none w-full sm:w-[520px] md:w-[720px] overflow-hidden p-0">
          {/* Header with tabs */}
          <div className="border-b border-border px-4 py-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Taskuri</div>
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${tasksActiveTab === 'dashboard' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-secondary text-secondary-foreground border-border'}`}
                  onClick={() => setTasksActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${tasksActiveTab === 'primite' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-secondary text-secondary-foreground border-border'}`}
                  onClick={() => {
                    setTasksActiveTab('primite');
                    if (!tasksPrimiteLoaded) fetchTasksPrimite();
                  }}
                >
                  Taskuri primite
                </button>
                <Button variant="ghost" size="sm" onClick={() => setShowTasksModal(false)} aria-label="Închide">

                </Button>
              </div>
            </div>
          </div>

          {/* Body scrollable */}
          <div className="h-[calc(100vh-52px)] overflow-y-auto px-4 py-4">
            {tasksActiveTab === 'dashboard' && (
              <div>
                {isLoadingTasksData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !tasksData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu există informații despre taskuri
                  </div>
                ) : (
                  <>
                    {/* Task Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-blue-100">Taskuri primite</h3>
                          <Badge variant="outline" className="bg-blue-800/50 text-blue-100">
                            {tasksData?.taskuri_primite || 0}
                          </Badge>
                        </div>
                        <p className="text-xs text-blue-200 mt-1">Taskuri care îți sunt atribuite</p>
                      </div>

                      <div className="bg-orange-900/30 border border-orange-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-orange-100">Taskuri trimise</h3>
                          <Badge variant="outline" className="bg-orange-800/50 text-orange-100">
                            {tasksData?.taskuri_trimise || 0}
                          </Badge>
                        </div>
                        <p className="text-xs text-orange-200 mt-1">Taskuri create de tine</p>
                      </div>

                      <div className="bg-green-900/30 border border-green-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-green-100">Taskuri finalizate</h3>
                          <Badge variant="outline" className="bg-green-800/50 text-green-100">
                            {tasksData?.taskuri_finalizate || 0}
                          </Badge>
                        </div>
                        <p className="text-xs text-green-200 mt-1">Taskuri completate</p>
                      </div>
                    </div>

                    {/* Ultimul task */}
                    <div className="mb-6">
                      <h3 className="text-base font-medium mb-3">Ultimul task</h3>
                      <div className="bg-muted/20 p-4 rounded-lg border border-muted">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className="px-2 py-0.5" 
                              style={{ backgroundColor: tasksData.ultimul_task?.categoriemare?.color || '#808080' }}
                            >
                              {tasksData.ultimul_task?.categoriemare?.categorie || 'Necategorizat'}
                            </Badge>
                            {tasksData.ultimul_task?.star && (
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <Badge variant={
                            tasksData.ultimul_task?.status === 'nepreluat' 
                              ? 'secondary' 
                              : tasksData.ultimul_task?.status?.includes('finalizat') 
                                ? 'default' 
                                : 'outline'
                          }>
                            {tasksData.ultimul_task?.status || 'Necunoscut'}
                          </Badge>
                        </div>

                        <h4 className="text-base font-medium mb-2">{tasksData.ultimul_task?.task || 'Fără titlu'}</h4>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {tasksData.ultimul_task?.utilizatori?.map((user) => (
                            <div key={user.id} className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded text-xs">
                              <span>{user.firstname} {user.lastname}</span>
                            </div>
                          )) || <div className="text-xs text-muted-foreground">Niciun utilizator asignat</div>}
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <span>Creat de {tasksData.ultimul_task?.initiatorel?.firstname || 'Utilizator'} {tasksData.ultimul_task?.initiatorel?.lastname || 'necunoscut'}</span>
                          <span className="mx-1">•</span>
                          <span>{tasksData.ultimul_task?.created_at ? new Date(tasksData.ultimul_task.created_at).toLocaleDateString('ro-RO') : 'Data necunoscută'}</span>
                          {tasksData.ultimul_task?.deadline && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-red-400">Termen: {new Date(tasksData.ultimul_task.deadline).toLocaleDateString('ro-RO')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Taskuri recente */}
                    <div>
                      <h3 className="text-base font-medium mb-3">Taskuri recente</h3>
                      <div className="space-y-3">
                        {tasksData?.ultimele_taskuri?.map((task) => (
                          <div key={task.id} className="bg-muted/10 p-3 rounded-lg border border-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className="px-1.5 py-0.5 text-xs" 
                                  style={{ backgroundColor: task.categoriemare?.color || '#808080' }}
                                >
                                  {task.categoriemare?.categorie || 'Necategorizat'}
                                </Badge>
                                {task?.star && (
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                )}
                              </div>
                              <Badge variant={
                                task?.status === 'nepreluat' 
                                  ? 'secondary' 
                                  : task?.status?.includes('finalizat') 
                                    ? 'default' 
                                    : 'outline'
                              } className="text-xs">
                                {task?.status || 'Necunoscut'}
                              </Badge>
                            </div>

                            <h4 className="text-sm font-medium mb-1">{task?.task || 'Fără titlu'}</h4>

                            <div className="flex flex-wrap gap-1 mb-1">
                              {task?.utilizatori?.map((user) => (
                                <div key={user.id} className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded text-xs">
                                  <span>{user.firstname} {user.lastname}</span>
                                </div>
                              )) || <div className="text-xs text-muted-foreground">Niciun utilizator asignat</div>}
                            </div>

                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <span>De la {task?.initiatorel?.firstname || 'Utilizator'} {task?.initiatorel?.lastname || 'necunoscut'}</span>
                              <span className="mx-1">•</span>
                              <span>{task?.created_at ? new Date(task.created_at).toLocaleDateString('ro-RO') : 'Data necunoscută'}</span>
                              {task?.deadline && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className={`${new Date(task.deadline) < new Date() ? 'text-red-400' : 'text-yellow-400'}`}>
                                    Termen: {new Date(task.deadline).toLocaleDateString('ro-RO')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )) || <div className="text-center py-4 text-muted-foreground">Nu există taskuri recente</div>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tasksActiveTab === 'primite' && (
              <div>
                {isLoadingTasksPrimite ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : tasksPrimiteError ? (
                  <div className="text-center py-8 text-destructive">{tasksPrimiteError}</div>
                ) : tasksPrimite.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nu ai taskuri primite</div>
                ) : (
                  <div className="space-y-3">
                    {tasksPrimite.map((task) => (
                      <div key={task.id} className="bg-muted/10 p-3 rounded-lg border border-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className="px-1.5 py-0.5 text-xs" 
                              style={{ backgroundColor: task.categoriemare?.color || '#808080' }}
                            >
                              {task.categoriemare?.categorie || 'Necategorizat'}
                            </Badge>
                            {task?.star && (
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <Badge variant={
                            task?.status === 'nepreluat' 
                              ? 'secondary' 
                              : task?.status?.includes('finalizat') 
                                ? 'default' 
                                : 'outline'
                          } className="text-xs">
                            {task?.status || 'Necunoscut'}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-medium mb-1">{task?.task || 'Fără titlu'}</h4>

                        <div className="flex flex-wrap gap-1 mb-1">
                          {task?.utilizatori?.map((u) => (
                            <div key={u.id} className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded text-xs">
                              <span>{u.firstname} {u.lastname}</span>
                            </div>
                          )) || <div className="text-xs text-muted-foreground">Niciun utilizator asignat</div>}
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span>De la {task?.initiatorel?.firstname || 'Utilizator'} {task?.initiatorel?.lastname || 'necunoscut'}</span>
                          <span className="mx-1">•</span>
                          <span>{task?.created_at ? new Date(task.created_at).toLocaleDateString('ro-RO') : 'Data necunoscută'}</span>
                          {task?.deadline && (
                            <>
                              <span className="mx-1">•</span>
                              <span className={`${new Date(task.deadline) < new Date() ? 'text-red-400' : 'text-yellow-400'}`}>
                                Termen: {new Date(task.deadline).toLocaleDateString('ro-RO')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
