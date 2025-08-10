import { useState, useEffect, useRef } from "react";
import { Package, Timer, Check, PlayCircle, RefreshCw } from "lucide-react";
import { WireframeBackground } from "@/components/WireframeBackground";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Content } from "@/components/layout/Content";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { DashboardProps, StatItem, PontajData, Comanda, WorkHistoryItem } from "@/types/dashboard";

const API_BASE = 'https://crm.actium.ro';
const EXTERNAL_API_URL = `${API_BASE}/api/statusurigravare`;
const PONTAJ_API_URL   = `${API_BASE}/api/azi-nou-angajat`;
const COMENZI_API_URL  = `${API_BASE}/api/comenzi-daruri-alese-gravare`;
const TIMER_START_API_URL = `${API_BASE}/api/action-timer-start-new`;
const TIMER_STOP_API_URL = `${API_BASE}/api/action-timer-stop-new`;
const WORK_HISTORY_API_URL = `${API_BASE}/api/zile-muncite-luna-curenta-nou`;

const initialStatsData: StatItem[] = [
    { title: "Gravare", value: 0, icon: Package, color: "bg-purple-500", group: 'right' },


    { title: "FAN", value: 0, icon: Package, color: "bg-blue-500", group: 'left' },
    { title: "DPD", value: 0, icon: Package, color: "bg-red-500", group: 'left' },

    { title: "Productie", value: 0, icon: Package, color: "bg-green-500", group: 'left' },
    { title: "Legatorie", value: 0, icon: Package, color: "bg-indigo-500", group: 'right' },

    { title: "Aprobare client", value: 0, icon: Timer, color: "bg-orange-500", group: 'right' },
    { title: "Procesare", value: 0, icon: null, color: "bg-blue-500", group: 'right' },
    { title: "In asteptare", value: 0, icon: null, color: "bg-yellow-500", group: 'right' },
    { title: "Plata in asteptare", value: 0, icon: null, color: "bg-red-500", group: 'right' }
];

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
    const [zonaActiva, setZonaActiva] = useState(() =>
        localStorage.getItem('zonaActiva') || 'gravare'
    );
    const [statsData, setStatsData] = useState<StatItem[]>(initialStatsData);
    const [isLoading, setIsLoading] = useState(false);
    const [comenzi, setComenzi] = useState<Comanda[]>([]);
    const [isLoadingComenzi, setIsLoadingComenzi] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedShippingData, setSelectedShippingData] = useState<string | null>(null);

    const [pontajData, setPontajData] = useState<PontajData | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    
    const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>([]);
    const [isLoadingWorkHistory, setIsLoadingWorkHistory] = useState(false);
    
    const [isFromCache, setIsFromCache] = useState(true);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const getStatusuri = async (zona: string) => {
        setIsLoadingStatus(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${EXTERNAL_API_URL}/${zona}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('Eroare statusuri');
            const data = await res.json();
            
            // Update from_cache status
            setIsFromCache(data.from_cache || false);
            
            // If not from cache, refresh orders
            if (data.from_cache === false) {
                refreshComenzi(zona);
            }
            
            return data;
        } finally {
            setIsLoadingStatus(false);
        }
    };
    
    const refreshComenzi = (zona: string) => {
        setIsLoadingComenzi(true);
        getComenzi(zona)
            .then((data) => {
                setComenzi(Array.isArray(data) ? data : []);
            })
            .catch((error) => {
                console.error('Eroare la încărcarea comenzilor:', error);
                setComenzi([]);
            })
            .finally(() => setIsLoadingComenzi(false));
    };

    const getComenzi = async (zona: string) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${COMENZI_API_URL}/${zona}`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Eroare comenzi');
        return await res.json();
    };

    const checkPontaj = async () => {
        const storedUserData = localStorage.getItem('userData');
        if (!storedUserData) return;
        const userData = JSON.parse(storedUserData);
        const userId = userData.id;
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${PONTAJ_API_URL}/${userId}`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error("Eroare API pontaj");
        const data = await response.json();
        setPontajData(data);
        setTimerRunning(data.pontaj_pornit);
        setTimerSeconds(data.minute * 60);
    };
    
    const getWorkHistory = async () => {
        try {
            setIsLoadingWorkHistory(true);
            const storedUserData = localStorage.getItem('userData');
            if (!storedUserData) return;
            
            const userData = JSON.parse(storedUserData);
            const userId = userData.id;
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${WORK_HISTORY_API_URL}/${userId}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error("Eroare la încărcarea istoricului de pontaj");
            
            const data = await response.json();
            setWorkHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Eroare la încărcarea istoricului de pontaj:", error);
            setWorkHistory([]);
        } finally {
            setIsLoadingWorkHistory(false);
        }
    };

    const selecteazaZona = (zona: string) => {
        const zonaFormatata = zona.toLowerCase().replace(/\s+/g, '');
        setZonaActiva(zonaFormatata);
        localStorage.setItem('zonaActiva', zonaFormatata);
    };

    // Reset selected product when zona changes to avoid invalid selection persisting
    useEffect(() => {
        setSelectedProductId(null);
    }, [zonaActiva]);

    // Function to update status data
    const updateStatusData = async (zona: string) => {
        try {
            const data = await getStatusuri(zona);
            const newStatsData = [...initialStatsData];
            if (data.statusuri) {
                newStatsData.find(stat => stat.title === "Productie")!.value = data.statusuri.debitare?.total || 0;
                newStatsData.find(stat => stat.title === "FAN")!.value = data.statusuri.fan?.total || 0;
                newStatsData.find(stat => stat.title === "DPD")!.value = data.statusuri.dpd?.total || 0;
                newStatsData.find(stat => stat.title === "Aprobare client")!.value = data.statusuri.aprobareclient?.total || 0;
                newStatsData.find(stat => stat.title === "Procesare")!.value = data.statusuri.procesare?.total || 0;
                newStatsData.find(stat => stat.title === "In asteptare")!.value = data.statusuri.onhold?.total || 0;
                newStatsData.find(stat => stat.title === "Plata in asteptare")!.value = data.statusuri.pending?.total || 0;
                newStatsData.find(stat => stat.title === "Gravare")!.value = data.statusuri.gravare?.total || 0;
                newStatsData.find(stat => stat.title === "Legatorie")!.value = data.statusuri.legatorie?.total || 0;
            }
            setStatsData(newStatsData);
        } catch (error) {
            console.error('Eroare la actualizarea statusurilor:', error);
            setStatsData(initialStatsData);
        }
    };

    // Initial data loading
    useEffect(() => {
        setIsLoading(true);
        setIsLoadingComenzi(true);

        // Initial status data load
        updateStatusData(zonaActiva)
            .finally(() => setIsLoading(false));

        // Initial orders load
        refreshComenzi(zonaActiva);

        checkPontaj();
        getWorkHistory();
        
        // Clear any existing interval when zona changes
        if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
        }
        
        // Set up polling for status data every 5 seconds
        if (timerRunning) {
            statusIntervalRef.current = setInterval(() => {
                updateStatusData(zonaActiva);
            }, 5000);
        }
        
        // Cleanup interval on unmount or when zona changes
        return () => {
            if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
                statusIntervalRef.current = null;
            }
        };
    }, [zonaActiva, timerRunning]);

    // Timer for seconds counter
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (timerRunning) {
            interval = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
            
            // Start status polling if it's not already running
            if (!statusIntervalRef.current) {
                statusIntervalRef.current = setInterval(() => {
                    updateStatusData(zonaActiva);
                }, 5000);
            }
        } else {
            // Stop status polling when timer is stopped
            if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
                statusIntervalRef.current = null;
            }
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerRunning, zonaActiva]);

    // Listen for manual refresh requests from Header and trigger status + orders refresh
    useEffect(() => {
        const handler = () => {
            try {
                updateStatusData(zonaActiva);
                refreshComenzi(zonaActiva);
            } catch (e) {
                // no-op
            }
        };
        // @ts-expect-error Custom event without detailed typing
        window.addEventListener('manual-refresh', handler as EventListener);
        return () => {
            // @ts-expect-error Custom event without detailed typing
            window.removeEventListener('manual-refresh', handler as EventListener);
        };
    }, [zonaActiva]);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleTimerToggle = async () => {
        try {
            const storedUserData = localStorage.getItem('userData');
            if (!storedUserData) return;
            
            const userData = JSON.parse(storedUserData);
            const userId = userData.id;
            const token = localStorage.getItem('authToken');
            
            // Determine which API to call based on current timer state
            const apiUrl = timerRunning 
                ? `${TIMER_STOP_API_URL}/${userId}` 
                : `${TIMER_START_API_URL}/${userId}`;
            
            const response = await fetch(apiUrl, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error("Eroare API pontaj");
            
            // If stopping the timer, log out the user
            if (timerRunning) {
                // First toggle the timer state
                setTimerRunning(false);
                // Then log out the user
                onLogout();
                return; // Exit early as we're logging out
            }
            
            // Toggle the timer state after successful API call (only for starting timer)
            setTimerRunning(true);
            
            // Refresh pontaj data
            checkPontaj();
        } catch (error) {
            console.error("Eroare la actualizarea pontajului:", error);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header 
                user={user}
                pontajData={pontajData}
                timerRunning={timerRunning}
                timerSeconds={timerSeconds}
                formatTime={formatTime}
                onLogout={onLogout}
                onTimerToggle={handleTimerToggle}
                workHistory={workHistory}
                isLoadingWorkHistory={isLoadingWorkHistory}
                formatDate={formatDate}
                isFromCache={isFromCache}
                isLoadingStatus={isLoadingStatus}
            />
            
            {timerRunning ? (
                <>
                    <div className="flex flex-1">
                        <Sidebar 
                            comenzi={comenzi} 
                            selectedProductId={selectedProductId}
                            setSelectedProductId={setSelectedProductId}
                        />
                        
                        <Content 
                            statsData={statsData}
                            isLoading={isLoading}
                            isLoadingComenzi={isLoadingComenzi}
                            isLoadingStatus={isLoadingStatus}
                            isFromCache={isFromCache}
                            comenzi={comenzi}
                            setComenzi={setComenzi}
                            zonaActiva={zonaActiva}
                            formatDate={formatDate}
                            selecteazaZona={selecteazaZona}
                            selectedProductId={selectedProductId}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            selectedShippingData={selectedShippingData}
                            setSelectedShippingData={setSelectedShippingData}
                            userId={user.id}
                            refreshComenzi={() => refreshComenzi(zonaActiva)}
                        />
                    </div>
                    
                    {/*<Footer />*/}
                </>
            ) : (
                <WireframeBackground>
                    <div className="flex-1 flex items-center justify-center h-screen">
                        <div className="text-center p-8 max-w-md bg-black/30 backdrop-blur-sm rounded-lg shadow-lg border border-white/10">
                            <div className="mb-4 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold mb-2 text-white">Pontaj inactiv</h2>
                                <p className="text-gray-300">
                                    Pentru a accesa aplicația, trebuie să pornești pontajul apăsând pe butonul "Start" din bara de sus.
                                </p>
                            </div>
                            <Button 
                                onClick={handleTimerToggle}
                                className="mt-4 bg-green-500 hover:bg-green-600 shadow-lg"
                            >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Pornește pontajul
                            </Button>
                        </div>
                    </div>
                </WireframeBackground>
            )}
        </div>
    );
};