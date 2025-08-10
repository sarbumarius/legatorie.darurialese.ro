import React, { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Info, Package, AlertTriangle, ShoppingCart, Eye, Printer, Gift, Database, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Comanda, Produs, StatItem } from "@/types/dashboard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ContentProps {
  statsData: StatItem[];
  isLoading: boolean;
  isLoadingComenzi: boolean;
  isLoadingStatus: boolean;
  isFromCache: boolean;
  comenzi: Comanda[];
  setComenzi: React.Dispatch<React.SetStateAction<Comanda[]>>;
  zonaActiva: string;
  formatDate: (dateString: string) => string;
  selecteazaZona: (zona: string) => void;
  selectedProductId: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedShippingData: string | null;
  setSelectedShippingData: (data: string | null) => void;
  userId: number;
  refreshComenzi: () => void;
}

export const Content = ({
  statsData,
  isLoading,
  isLoadingComenzi,
  isLoadingStatus,
  isFromCache,
  comenzi,
  setComenzi,
  zonaActiva,
  formatDate,
  selecteazaZona,
  selectedProductId,
  searchTerm,
  setSearchTerm,
  selectedShippingData,
  setSelectedShippingData,
  userId,
  refreshComenzi
}: ContentProps) => {
  // State for problem reporting modal
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Comanda | null>(null);

  // State for gallery modal
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // State for inline product annex panel (expanded under status row)
  const [expandedProdPanel, setExpandedProdPanel] = useState<{
    orderId: number;
    productIndex: number;
  } | null>(null);

  // Form state for problem reporting
  const [problemZone, setProblemZone] = useState<string>("");
  const [problemProduct, setProblemProduct] = useState<string>("");
  const [problemDescription, setProblemDescription] = useState<string>("");

  // State for tracking which command is being moved or started
  const [movingCommandId, setMovingCommandId] = useState<number | null>(null);
  const [startingCommandId, setStartingCommandId] = useState<number | null>(null);

  // State for inventory modal
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newStockValues, setNewStockValues] = useState<{[key: number]: number}>({});
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");

  // State for studiu modal
  const [showStudiuModal, setShowStudiuModal] = useState(false);
  const [studiuData, setStudiuData] = useState<any[]>([]);
  const [isLoadingStudiu, setIsLoadingStudiu] = useState(false);
  const [studiuError, setStudiuError] = useState<string | null>(null);
  const [studiuMarkLoading, setStudiuMarkLoading] = useState<Record<number, boolean>>({});

  // Orders grid columns on desktop (2/3/4), default 3, synced with Header select
  const [desktopCols, setDesktopCols] = useState<number>(3);

  // State for mobile status expansion
  const [areStatusesExpanded, setAreStatusesExpanded] = useState(false);

  // Filter: All | Cu gravare | Cu printare (default All)
  const [filterTipGrafica, setFilterTipGrafica] = useState<'all' | 'gravare' | 'printare'>('all');

  // Floating chat state (Chat cu Grafica)
  type ChatMsg = { from: 'eu' | 'grafica'; text: string; time: string };
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { from: 'grafica', text: 'Salut! Cu ce te pot ajuta la fișierul de gravare?', time: '09:12' },
    { from: 'eu', text: 'Salut! Putem mări textul cu 10% și să-l centram?', time: '09:13' },
    { from: 'grafica', text: 'Da, fac acum și revin cu fișierul actualizat.', time: '09:14' },
  ]);

  const nowTime = () => {
    try {
      const d = new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Notify other components (Header) when chat visibility changes
  useEffect(() => {
    try {
      // @ts-ignore CustomEvent detail is boolean
      window.dispatchEvent(new CustomEvent('chat-visibility-change', { detail: showChat }));
    } catch (e) {}
  }, [showChat]);

    // State for tracking expanded sections in mobile view
    const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

    // Function to toggle a section's expanded state for a specific command
    const toggleSection = (commandId: number) => {
      setExpandedSections(prev => ({
        ...prev,
        [commandId]: !prev[commandId]
      }));
    };

  // Function to encode URL to base64
  const encodeToBase64 = useCallback((url: string) => {
    // In browser environment, btoa() is used for base64 encoding
    return btoa(url);
  }, []);

  // Filter orders if a product is selected, shipping data is selected, or search term is entered
  const displayedComenzi = React.useMemo(() => {
    let filtered = comenzi;

    // Filter by selected product
    if (selectedProductId) {
      filtered = filtered.filter(comanda => 
        comanda.produse_finale.some(produs => produs.id_produs === selectedProductId)
      );
    }

    // Filter by selected shipping data
    if (selectedShippingData) {
      filtered = filtered.filter(comanda => 
        formatDate(comanda.expediere).split(' ')[0].replace(',', '') === selectedShippingData
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(comanda => {
        // Search by name
        const fullName = `${comanda.shipping_details._shipping_first_name} ${comanda.shipping_details._shipping_last_name}`.toLowerCase();
        if (fullName.includes(term)) return true;

        // Search by order ID
        if (comanda.ID.toString().includes(term)) return true;

        return false;
      });
    }

    // Filter by tip grafica (gravare/printare/all)
    if (filterTipGrafica === 'gravare') {
      filtered = filtered.filter(comanda => !!comanda.gravare);
    } else if (filterTipGrafica === 'printare') {
      filtered = filtered.filter(comanda => !!comanda.printare);
    }

    // Filter out commands that are being moved
    if (movingCommandId !== null) {
      filtered = filtered.filter(comanda => comanda.ID !== movingCommandId);
    }

    // We don't filter out commands that are being started
    // This allows the command to remain visible while processing

    // Sort orders with logprodebitare first
    filtered = filtered.sort((a, b) => {
      if (a.logprogravare && !b.logprogravare) return -1;
      if (!a.logprogravare && b.logprogravare) return 1;
      return 0;
    });

    return filtered;
  }, [comenzi, selectedProductId, selectedShippingData, searchTerm, formatDate, movingCommandId, filterTipGrafica]);


  // Extract unique shipping dates
  const uniqueShippingDates = React.useMemo(() => {
    const dates = new Set<string>();
    comenzi.forEach(comanda => {
      const shippingDate = formatDate(comanda.expediere).split(' ')[0].replace(',', '');
      dates.add(shippingDate);
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [comenzi, formatDate]);

  // Keyboard navigation for gallery (left/right)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!showGalleryModal || !selectedImage || galleryImages.length < 2) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const len = galleryImages.length;
        let idx = selectedImageIndex ?? galleryImages.findIndex((img) => `https://darurialese.ro/wp-content/uploads/${img}` === selectedImage);
        if (idx < 0) idx = 0;
        const next = e.key === 'ArrowRight' ? (idx + 1) % len : (idx - 1 + len) % len;
        setSelectedImage(`https://darurialese.ro/wp-content/uploads/${galleryImages[next]}`);
        setSelectedImageIndex(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGalleryModal, selectedImage, selectedImageIndex, galleryImages]);

  // Reset movingCommandId when zone changes
  useEffect(() => {
    setMovingCommandId(null);
    setStartingCommandId(null);
  }, [zonaActiva]);

  // Init desktop cols from localStorage and listen for changes from Header
  useEffect(() => {
    try {
      const saved = localStorage.getItem('desktopOrderCols');
      const parsed = saved ? parseInt(saved, 10) : 3;
      setDesktopCols(parsed === 2 || parsed === 4 ? parsed : 3);
    } catch (e) {}
    const handler = (e: Event) => {
      const anyEvent = e as CustomEvent<number>;
      const val = anyEvent?.detail;
      if (val === 2 || val === 3 || val === 4) {
        setDesktopCols(val);
      }
    };
    window.addEventListener('order-cols-change', handler as EventListener);
    return () => {
      window.removeEventListener('order-cols-change', handler as EventListener);
    };
  }, []);

  // Function to fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setIsLoadingInventory(true);
      setIsEditMode(false);
      setNewStockValues({});
      setInventorySearchTerm("");

      const response = await fetch('https://actium.ro/api/financiar/lista-raport-stocuri/sistem:gravare');

      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const data = await response.json();
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      alert('A apărut o eroare la încărcarea datelor de inventar. Vă rugăm să încercați din nou.');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Function to fetch studiu data
  const fetchStudiuData = async () => {
    try {
      setIsLoadingStudiu(true);
      setStudiuError(null);
      setStudiuData([]);

      const response = await fetch('https://crm.actium.ro/api/studiu', {
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Eroare la încărcarea studiului');
      }

      const json = await response.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      // Filter out items that have already been debited (true, 1, or '1')
      const filtered = items.filter((it: any) => {
        // Filter out items where am_gravat is true, 1, or '1'
        if (it?.am_gravat === true || it?.am_gravat === 1 || it?.am_gravat === '1') {
          return false;
        }

        // Also filter out items where all three fields are null
        if (it?.am_gravat === null && it?.am_debitat === null && it?.am_printat === null) {
          return false;
        }

        return true;
      });
      setStudiuData(filtered);
    } catch (error) {
      console.error('Error fetching studiu data:', error);
      setStudiuError('A apărut o eroare la încărcarea studiului. Vă rugăm să încercați din nou.');
      alert('A apărut o eroare la încărcarea studiului. Vă rugăm să încercați din nou.');
    } finally {
      setIsLoadingStudiu(false);
    }
  };

  // Mark a studiu item as debitat
  const handleMarkStudiuDebitat = async (id: number) => {
    try {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: true }));

      // Try POST first
      let response = await fetch(`https://crm.actium.ro/api/studiu/debitat/${id}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // If POST is not allowed, fallback to GET
      if (!response.ok && response.status === 405) {
        response = await fetch(`https://crm.actium.ro/api/studiu/debitat/${id}`, {
          method: 'GET',
          headers: { 'accept': 'application/json' }
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Eroare la marcarea ca debitat');
      }

      // On success, remove item from list (since am_debitat === true should be filtered out)
      setStudiuData(prev => prev.filter((it: any) => it?.id !== id));
    } catch (e) {
      console.error('Eroare la marcarea ca debitat:', e);
      alert('A apărut o eroare la marcarea ca debitat. Încercați din nou.');
    } finally {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Mark a studiu item as printat
  const handleMarkStudiuPrintat = async (id: number) => {
    try {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: true }));

      // Try POST first
      let response = await fetch(`https://crm.actium.ro/api/studiu/printat/${id}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // If POST is not allowed, fallback to GET
      if (!response.ok && response.status === 405) {
        response = await fetch(`https://crm.actium.ro/api/studiu/printat/${id}`, {
          method: 'GET',
          headers: { 'accept': 'application/json' }
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Eroare la marcarea ca printat');
      }

      // On success, remove item from list (since am_printat === true should be filtered out)
      setStudiuData(prev => prev.filter((it: any) => it?.id !== id));
    } catch (e) {
      console.error('Eroare la marcarea ca printat:', e);
      alert('A apărut o eroare la marcarea ca printat. Încercați din nou.');
    } finally {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Mark a studiu item as gravat
  const handleMarkStudiuGravat = async (id: number) => {
    try {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: true }));

      // Try POST first
      let response = await fetch(`https://crm.actium.ro/api/studiu/gravat/${id}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // If POST is not allowed, fallback to GET
      if (!response.ok && response.status === 405) {
        response = await fetch(`https://crm.actium.ro/api/studiu/gravat/${id}`, {
          method: 'GET',
          headers: { 'accept': 'application/json' }
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Eroare la marcarea ca gravat');
      }

      // On success, remove item from list (since am_gravat === true should be filtered out)
      setStudiuData(prev => prev.filter((it: any) => it?.id !== id));
    } catch (e) {
      console.error('Eroare la marcarea ca gravat:', e);
      alert('A apărut o eroare la marcarea ca gravat. Încercați din nou.');
    } finally {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Mark a studiu item as produs fizic
  const handleMarkStudiuProdusFizic = async (id: number) => {
    try {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: true }));

      // Try POST first
      let response = await fetch(`https://crm.actium.ro/api/studiu/produsfizic/${id}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // If POST is not allowed, fallback to GET
      if (!response.ok && response.status === 405) {
        response = await fetch(`https://crm.actium.ro/api/studiu/produsfizic/${id}`, {
          method: 'GET',
          headers: { 'accept': 'application/json' }
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Eroare la marcarea ca produs fizic');
      }

      // On success, remove item from list
      setStudiuData(prev => prev.filter((it: any) => it?.id !== id));
    } catch (e) {
      console.error('Eroare la marcarea ca produs fizic:', e);
      alert('A apărut o eroare la marcarea ca produs fizic. Încercați din nou.');
    } finally {
      setStudiuMarkLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Function to handle saving stock values
  const handleSaveStockValues = async () => {
    try {
      setIsSavingStock(true);

      // Prepare data for submission
      const stockUpdates = Object.entries(newStockValues).map(([itemId, newValue]) => ({
        id: parseInt(itemId),
        numar_stoc: newValue
      }));

      // Log the data that would be sent to the API
      console.log('Stock updates to be sent:', stockUpdates);

      // Since the API endpoint doesn't exist yet, we'll just simulate a successful response
      // In a real implementation, you would make an API call here
      // const response = await fetch('https://actium.ro/api/financiar/update-stocuri', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(stockUpdates),
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the local inventory data with the new values
      const updatedInventoryData = inventoryData.map(item => {
        if (newStockValues[item.id] !== undefined) {
          return {
            ...item,
            numar_stoc: newStockValues[item.id]
          };
        }
        return item;
      });

      setInventoryData(updatedInventoryData);
      setIsEditMode(false);
      setNewStockValues({});

      // Show success message
      alert('Stocurile au fost actualizate cu succes!');

    } catch (error) {
      console.error('Error saving stock values:', error);
      alert('A apărut o eroare la salvarea stocurilor. Vă rugăm să încercați din nou.');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Function to handle stock value change
  const handleStockValueChange = (itemId: number, value: string) => {
    const numericValue = parseInt(value);

    if (!isNaN(numericValue) && numericValue >= 0) {
      setNewStockValues(prev => ({
        ...prev,
        [itemId]: numericValue
      }));
    } else if (value === '') {
      // Allow empty input for better UX
      setNewStockValues(prev => {
        const newValues = { ...prev };
        delete newValues[itemId];
        return newValues;
      });
    }
  };

  // Function to handle form submission
  const handleSubmitProblem = () => {
    // Build situation message for chat
    try {
      const orderId = currentOrder?.ID ? `#${currentOrder.ID}` : '(fără ID)';
      const zona = problemZone || 'Grafica';
      let produsNume = '';
      if (currentOrder && Array.isArray(currentOrder.produse_finale)) {
        const found = currentOrder.produse_finale.find((p: any) => String(p?.id_produs) === String(problemProduct));
        produsNume = found?.nume || (problemProduct ? `Produs ${problemProduct}` : 'Produs nespecificat');
      }
      const descriere = problemDescription?.trim() || '(fără descriere)';
      const msg = `Problema comandă ${orderId}\nZona: ${zona}\nProdus: ${produsNume}\nDescriere: ${descriere}`;
      const mine = { from: 'eu' as const, text: msg, time: nowTime() };
      setChatMessages((prev) => [...prev, mine]);
      setShowChat(true);
      // Fake acknowledgement from Grafica
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { from: 'grafica' as const, text: 'Am preluat problema comenzii. Revin cu un update în curând. 🛠️', time: nowTime() },
        ]);
      }, 900);
    } catch (e) {
      // no-op if chat state unavailable
    }

    // Reset form and close modal
    setProblemZone("");
    setProblemProduct("");
    setProblemDescription("");
    setShowProblemModal(false);
  };

  // Function to handle "Muta" button click
  const handleMutaClick = async (comandaId: number) => {
    try {
      // Set the moving command ID to show loading state
      setMovingCommandId(comandaId);

      const response = await fetch(`https://crm.actium.ro/api/muta-gravare/${comandaId}/${userId}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'accept': 'application/json',
        }
      });

      // Parse the response
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la mutarea comenzii');
      }

      // Handle successful response
      console.log('Comanda mutată cu succes:', data);

      // Refresh the data to reflect the changes
      //refreshComenzi();

    } catch (error) {
      console.error('Eroare la mutarea comenzii:', error);
      alert('A apărut o eroare la mutarea comenzii. Vă rugăm să încercați din nou.');
    } finally {
      // Clear the moving command ID regardless of success or failure
      //setMovingCommandId(null);
    }
  };

  // Handlers stubs pentru upload/replace/ștergere anexe (vor fi conectate când primim API)
  const handleUploadAnnex = async (
    orderId: number,
    productIndex: number,
    key: string,
    file: File,
    useAlpha: boolean
  ) => {
    try {
      // TODO: conectare API upload/replace
      alert(`Upload anexa ${key} (${useAlpha ? 'alpha' : 'normal'}) pentru comanda ${orderId}, produs #${productIndex + 1} (API în curs de configurare)`);
    } catch (e) {
      console.error('Eroare upload anexa', e);
    }
  };

  const handleDeleteAnnex = async (
    orderId: number,
    productIndex: number,
    key: string,
    useAlpha: boolean
  ) => {
    try {
      // TODO: conectare API delete
      alert(`Șterge anexa ${key} (${useAlpha ? 'alpha' : 'normal'}) pentru comanda ${orderId}, produs #${productIndex + 1} (API în curs de configurare)`);
    } catch (e) {
      console.error('Eroare ștergere anexa', e);
    }
  };

  // Function to handle "Incepe Debitare" button click
  const handleIncepeDebitareClick = async (comandaId: number) => {
    try {
      // Set the starting command ID to show loading state
      setStartingCommandId(comandaId);

      const response = await fetch(`https://crm.actium.ro/api/incepe-gravare/${comandaId}/${userId}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'accept': 'application/json',
        }
      });

      // Parse the response
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la începerea debitării');
      }

      // Handle successful response
      console.log('Debitare începută cu succes:', data);

      // Update the command locally to show the "Muta" button instead of refreshing
      setComenzi(prevComenzi => 
        prevComenzi.map(comanda => 
          comanda.ID === comandaId 
            ? { ...comanda, logprogravare: true }
            : comanda
        )
      );

    } catch (error) {
      console.error('Eroare la începerea debitării:', error);
      alert('A apărut o eroare la începerea debitării. Vă rugăm să încercați din nou.');
    } finally {
      // Clear the starting command ID regardless of success or failure
      setStartingCommandId(null);
    }
  };

  return (
    <>
      <main className={`${showChat ? 'pr-[15vw]' : ''} ml-32 mt-20 flex-1 backgroundculiniute`}>
        <div className="grid grid-cols-1 sm:grid-cols-9 gap-2 mb-6 relative p-3 border border-b-1 border-border bg-white dark:bg-[#020817]  ">
          {/* Mobile toggle button for expanding/collapsing statuses */}
          <div className="sm:hidden w-full mb-2 flex justify-center -mt-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAreStatusesExpanded(!areStatusesExpanded)}
              className="flex items-center gap-1 text-xs"
            >
              {areStatusesExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Ascunde statusuri</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Arată toate statusurile</span>
                </>
              )}
            </Button>
          </div>

          {/* Status cards */}
          {statsData.map((stat, idx) => {
            // On mobile, only show "Productie" by default or if statuses are expanded
            const isProduction = stat.title === "Productie";

            return (
              <Card
                key={idx}
                className={`p-2 cursor-pointer whitespace-nowrap transition-colors ${
                  zonaActiva === stat.title.toLowerCase().replace(/\s+/g, '')
                    ? 'border-2 border-green-500'
                    : ''
                } ${
                  // Hide non-production statuses on mobile when not expanded
                  !isProduction ? 'hidden sm:block' : ''
                } ${
                  // Show all statuses when expanded (on mobile only)
                  !isProduction && areStatusesExpanded ? '!block sm:block' : ''
                } ${
                  // Low opacity when value is 0
                  stat.value === 0 ? 'opacity-40' : ''
                }`}
                onClick={() => selecteazaZona(stat.title)}
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const t = (stat.title || '').toLowerCase();
                    if (t === 'dpd') {
                      return (
                        <div className="w-12 h-7 bg-white rounded flex items-center justify-center">
                          <img src="/curieri/dpd.jpg" alt="dpd  Courier" className="w-10 h-6 object-contain" />
                        </div>
                      );
                    }
                    if (t === 'fan' || t === 'fan courier' || t === 'fancurier') {
                      return (
                        <div className="w-12 h-7 bg-white rounded flex items-center justify-center">
                          <img src="/curieri/fan.jpg" alt="FAN Courier" className="w-10 h-6 object-contain" />
                        </div>
                      );
                    }
                    return stat.icon ? (
                      <div className={`w-6 h-6 ${stat.color} rounded flex items-center justify-center`}>
                        <stat.icon className="w-4 h-4 text-white" />
                      </div>
                    ) : null;
                  })()}
                  <span className="text-xs">{stat.title}</span>
                  <span className="ml-auto font-bold">{stat.value}</span>
                </div>
              </Card>
            );
          })}

          {/* Cache/Live status indicator - always visible on all screen sizes */}
          {/*<div className="border-2 border-green-500 rounded-lg p-2 flex items-center justify-center col-span-1 sm:col-span-1">*/}
          {/*  {isLoadingStatus ? (*/}
          {/*    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>*/}
          {/*  ) : (*/}
          {/*    <div className="flex items-center">*/}
          {/*      <div */}
          {/*        className={`w-4 h-4 rounded-full mr-2 ${*/}
          {/*          isFromCache */}
          {/*            ? 'bg-green-500 animate-pulse' */}
          {/*            : 'bg-red-500 animate-pulse'*/}
          {/*        }`}*/}
          {/*      ></div>*/}
          {/*      <span className="text-xs font-medium">{isFromCache ? 'Cache' : 'Live'}</span>*/}
          {/*    </div>*/}
          {/*  )}*/}
          {/*</div>*/}
        </div>

        {/* Panou global anexe produs - ascuns conform cerinței */}
        {false && expandedProdPanel && (() => {
          const selOrder = comenzi.find((c) => c.ID === expandedProdPanel.orderId);
          const prod = selOrder?.produse_finale?.[expandedProdPanel.productIndex];
          if (!selOrder || !prod) return null;
          const annexCols = [
            { header: 'Alpha', key: 'alpha' },
            { header: 'Wenge', key: 'wenge' },
            { header: 'Alb', key: 'alb' },
            { header: 'Natur', key: 'natur' },
            { header: 'Plexi', key: 'plexi' },
            { header: 'Print', key: 'print' },
            { header: 'Gold', key: 'gold' },
            { header: 'Plexi Alb', key: 'plexi_alb' },
            { header: 'Plexi A.Satin', key: 'plexi_alb_satin' },
            { header: 'Plexi Negru', key: 'plexi_negru' },
            { header: 'Vop.Argintiu', key: 'argintiu' },
            { header: 'G.Alb', key: 'gravarealb' },
            { header: 'G.Wenge', key: 'gravarewenge' },
            { header: 'Plexi Gold', key: 'plexi_gold' }
          ];
          const hasAnyAlpha = (prod as any)?.anexe_alpha && Object.keys((prod as any).anexe_alpha).length > 0;
          const getFile = (k: string) => {
            const a = (prod as any)?.anexe_alpha?.[k];
            const n = (prod as any)?.anexe?.[k];
            return { file: a || n, useAlpha: !!a };
          };
          return (
            <div className="border border-border w-full p-3 rounded-md bg-card/50 mb-4 " style={{ width: '100%', overflow: 'auto' }}>
              <div className="relative overflow-x-auto">
                <Table className="w-full text-xs min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      {annexCols.map((col, i) => (
                        <TableHead key={i} className="text-center align-middle">
                          {col.key === 'alpha' ? (
                            <button type="button" className={`text-center w-full cursor-pointer text-xs font-medium rounded border px-2 py-0.5 ${hasAnyAlpha ? 'bg-green-100 text-green-800 border-green-500 dark:bg-green-700 dark:text-green-100' : 'bg-secondary text-secondary-foreground border-border'}`}>Alpha</button>
                          ) : (
                            col.header
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-background">
                      {annexCols.map((col, i) => {
                        if (col.key === 'alpha') {
                          return (
                            <TableCell key={i} className="text-center align-top">
                              <div className="flex flex-col items-center">
                                <img
                                  onClick={() => setExpandedProdPanel(null)}
                                  style={{ width: 70 }}
                                  className="rounded-xl m-auto mb-2 cursor-pointer"
                                  src={prod.poza ? `https://darurialese.com/wp-content/uploads/${prod.poza}` : '/api/placeholder/70/70'}
                                  alt="produs"
                                />
                              </div>
                            </TableCell>
                          );
                        }
                        const { file, useAlpha } = getFile(col.key);
                        const hasFile = !!file;
                        return (
                          <TableCell key={i} className="text-center align-top p-1">
                            <div className="flex flex-col items-center justify-center w-full">
                              <label className={`flex flex-col items-center justify-center w-full border-2 ${hasFile ? 'border-green-300 bg-green-50 dark:bg-gray-700' : 'border-gray-300 bg-gray-50 dark:bg-gray-700'} border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600`}>
                                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                  <svg className={`mt-2 w-8 h-8 mb-1 ${hasFile ? 'text-green-500' : 'text-gray-500'} dark:text-gray-400 m-auto`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"></path>
                                  </svg>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadAnnex(selOrder.ID, expandedProdPanel.productIndex, col.key, f, useAlpha);
                                    e.currentTarget.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div className="mt-2">
                              {hasFile ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAnnex(selOrder.ID, expandedProdPanel.productIndex, col.key, useAlpha)}
                                  className="mt-1 text-center w-full bg-red-100 text-red-800 cursor-pointer text-xs font-medium rounded dark:bg-red-700 dark:text-red-400 border border-red-500"
                                  title="Șterge anexa"
                                >
                                  <svg className="w-4 h-4 text-center m-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"></path></svg>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="opacity-20 mt-1 w-full bg-gray-100 text-gray-800 cursor-default text-xs font-medium rounded border border-gray-500"
                                  title="Fără anexa"
                                  disabled
                                >
                                  <svg className="w-4 h-4 text-center m-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"></path></svg>
                                </button>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })()}

        <div className="mb-6 mx-3">
          {/* Mobile view: flex layout */}
          <div className="flex flex-col sm:hidden gap-3">
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută comenzi după nume sau ID..."
                className="p-2 border rounded-md w-full text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Desktop view: 3-grid layout */}
          <div className="hidden sm:grid md:grid-cols-3 gap-3 ">

              {/* Middle grid: Inventory and Studiu buttons */}
              <div className="flex gap-2 items-stretch">
                  <Card
                      className="p-2 cursor-pointer whitespace-nowrap transition-colors h-full flex items-center"
                      onClick={() => {
                          fetchInventoryData();
                          setShowInventoryModal(true);
                      }}
                  >
                      <div className="flex items-center gap-2">
                          <div className="w-6 h-6  rounded flex items-center justify-center">
                              <Database className="w-4 h-4 text-black dark:text-white" />
                          </div>
                          <span className="text-xs">Stocuri</span>
                      </div>
                  </Card>
                  <Card
                      className="p-2 cursor-pointer whitespace-nowrap transition-colors h-full flex items-center"
                      onClick={() => {
                          fetchStudiuData();
                          setShowStudiuModal(true);
                      }}
                  >
                      <div className="flex items-center gap-2">
                          <div className="w-6 h-6  rounded flex items-center justify-center">
                              <Info className="w-4 h-4 text-black dark:text-white" />
                          </div>
                          <span className="text-xs">Studiu</span>
                      </div>
                  </Card>
                  {/* Filtru: All / Cu gravare / Cu printare */}
                  <Card className="px-3 py-2 flex items-center">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Filtru:</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="tipGrafica"
                          value="all"
                          checked={filterTipGrafica === 'all'}
                          onChange={() => setFilterTipGrafica('all')}
                          className="accent-blue-600"
                        />
                        <span>All</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="tipGrafica"
                          value="gravare"
                          checked={filterTipGrafica === 'gravare'}
                          onChange={() => setFilterTipGrafica('gravare')}
                          className="accent-blue-600"
                        />
                        <span>Cu gravare</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="tipGrafica"
                          value="printare"
                          checked={filterTipGrafica === 'printare'}
                          onChange={() => setFilterTipGrafica('printare')}
                          className="accent-blue-600"
                        />
                        <span>Cu printare</span>
                      </label>
                    </div>
                  </Card>
              </div>

            {/* Left grid: Search input */}
            <div className="flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută comenzi după nume sau ID..."
                className="p-2 border rounded-md w-full text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"
              />
            </div>



            {/* Right grid: Shipping dates */}
            <div className="flex justify-end">
              <div className="flex flex-wrap gap-1">
                {uniqueShippingDates.map((date, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedShippingData(selectedShippingData === date ? null : date)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedShippingData === date 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:opacity-90'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/*{selectedShippingData && (*/}
          {/*    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">*/}
          {/*      <div className="flex items-center gap-2">*/}
          {/*        <span className="text-blue-700 text-sm font-medium">Filtrare după data de expediere:</span>*/}
          {/*        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{selectedShippingData}</span>*/}
          {/*      </div>*/}
          {/*      <button*/}
          {/*          onClick={() => setSelectedShippingData(null)}*/}
          {/*          className="p-1 bg-blue-200 hover:bg-blue-300 rounded-full flex items-center justify-center"*/}
          {/*      >*/}
          {/*        <X size={16} className="text-blue-700" />*/}
          {/*      </button>*/}
          {/*    </div>*/}
          {/*)}*/}

        </div>



        {isLoading && <div className="p-4">Se încarcă statisticile...</div>}

        {isLoadingComenzi && (
          <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md z-50 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <p className="text-sm">Se actualizează...</p>
          </div>
        )}

        <div className="space-y-4 mx-3">
          {comenzi.length === 0 && !isLoadingComenzi && (
            <Card className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nu există comenzi pentru zona selectată</p>
            </Card>
          )}

          {comenzi.length > 0 && displayedComenzi.length === 0 && (
            <Card className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {selectedProductId && selectedShippingData 
                  ? "Nu există comenzi cu produsul selectat și data de expediere selectată" 
                  : selectedShippingData 
                    ? "Nu există comenzi cu data de expediere selectată" 
                    : "Nu există comenzi cu produsul selectat"}
              </p>
            </Card>
          )}

            {displayedComenzi.length > 0 && (
                <div
                    className={`${desktopCols === 2
                        ? 'md:columns-2'
                        : desktopCols === 4
                            ? 'md:columns-4'
                            : 'md:columns-3'
                    } columns-1 gap-x-6`}
                >
                    {displayedComenzi.map((comanda) => (
                        <Card
                            key={comanda.ID}
                            className={`p-4 bg-card relative mb-6 break-inside-avoid block ${comanda.logprogravare ? 'blue-shadow-pulse' : ''}`}
                        >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {comanda.shipping_details._shipping_first_name} {comanda.shipping_details._shipping_last_name}{" "}
                        <a 
                          href={`https://darurialese.com/wp-admin/post.php?post=${comanda.ID}&action=edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          #{comanda.ID}
                        </a>
                      </h3>
                    </div>
                    <div className="flex flex-col items-end space-y-1 bg-white p-1 rounded-3xl">
                      {comanda.ramburs === "FanCurier 0" ? (
                        <div className="courier-card">
                          <img src="/curieri/fan.jpg" alt="fan" className="w-10 h-6 object-contain" />
                        </div>
                      ) : comanda.ramburs === "FanCurier" ? (
                        <div className="courier-card">
                          <img src="/curieri/fan.jpg" alt="FAN Courier" className="w-10 h-6 object-contain" />
                        </div>
                      ) : comanda.ramburs === "DPD 0" ? (
                        <div className="courier-card">
                          <img src="/curieri/dpd.jpg" alt="dpd Courier" className="w-10 h-6 object-contain" />
                        </div>
                      ) : comanda.ramburs === "DPD" ? (
                        <div className="courier-card">
                          <img src="/curieri/dpd.jpg" alt="DPD" className="w-10 h-6 object-contain" />
                        </div>
                      ) : (
                       <>
                       </>
                      )}
                    </div>
                  </div>

                  {/* Alert: Anexe diferite - ascuns conform cerinței */}
                  {false && (() => {
                    const ad: any = (comanda as any)?.anexe_diferite_comanda;
                    const flag = (ad && (ad.anexe_diferite_comanda === '1' || ad.anexe_diferite_comanda === 1 || ad.anexe_diferite_comanda === true))
                      || ad === '1' || ad === 1 || ad === true;
                    if (!flag) return null;
                    return (
                      <div className="w-full mb-3">
                        <div className="w-full rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                          Atentie: Anexe diferite!
                        </div>
                      </div>
                    );
                  })()}

                  {/* Alerte: Anexe diferite / Cantitate diferita / Atentie Pix */}
                  {(() => {
                    // Anexe diferite flag (existing logic)
                    const ad: any = (comanda as any)?.anexe_diferite_comanda;
                    const hasAnexeDiferite = (ad && (ad.anexe_diferite_comanda === '1' || ad.anexe_diferite_comanda === 1 || ad.anexe_diferite_comanda === true))
                      || ad === '1' || ad === 1 || ad === true;

                    // Cantitate diferita: any product has quantity > 1
                    const hasCantitateDiferita = Array.isArray(comanda.produse_finale)
                      && comanda.produse_finale.some((p: any) => {
                        const q = typeof p?.quantity === 'string' ? parseFloat(p.quantity) : p?.quantity;
                        return Number(q) > 1;
                      });

                    // Atenție Pix: atentie_pix = 1/true/'1'
                    const ap: any = (comanda as any)?.atentie_pix;
                    const hasAtentiePix = ap === '1' || ap === 1 || ap === true;

                    if (!hasAnexeDiferite && !hasCantitateDiferita && !hasAtentiePix) return null;

                    return (
                      <div className="w-full mb-3">
                        <div className=" gap-2">
                          {hasAnexeDiferite && (
                            <div className="mb-2 rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                              Atentie: Anexe diferite!
                            </div>
                          )}
                          {hasCantitateDiferita && (
                            <div className="mb-2 rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                              Atentie: Cantitate diferita!
                            </div>
                          )}
                          {hasAtentiePix && (
                            <div className="rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                              Atentie: Pix!
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Alert: Refacut - motiv afișat când refacut = 1 */}
                  {(() => {
                    const rf: any = (comanda as any)?.refacut;
                    const isRefacut = rf === '1' || rf === 1 || rf === true;
                    const motiv = (comanda as any)?.motiv_refacut;
                    const motivText = typeof motiv === 'string' ? motiv.trim() : '';
                    if (!isRefacut || !motivText) return null;
                    return (
                      <div className="w-full mb-3">
                        <div className="rounded-md border px-3 py-2 text-xs font-medium bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">
                          Motiv refăcut: {motivText}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-muted/30 p-2 rounded-md mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Expediere</span>
                        <span 
                          className={`font-semibold ${
                            selectedShippingData === formatDate(comanda.expediere).split(' ')[0].replace(',', '') 
                              ? 'bg-blue-100 text-blue-800 px-1 rounded' 
                              : ''
                          }`}
                        >
                          {formatDate(comanda.expediere).split(' ')[0].replace(',', '')}
                        </span>
                      </div>
                      <div className="flex flex-col border-l border-border pl-2">
                        <span className="text-muted-foreground">Intrat pe</span>
                        <span className="font-semibold">{formatDate(comanda.post_date).split(' ')[0]}</span>
                      </div>
                      <div className="flex flex-col border-l border-border pl-2">
                        <span className="text-muted-foreground">Bucăți</span>
                        <span className="font-semibold">{comanda.total_buc}</span>
                      </div>
                      <div className="flex flex-col border-l border-border pl-2  rounded-r">
                        <span className="text-muted-foreground">Preț</span>
                        <span className="font-bold">{comanda.order_total_formatted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:hidden w-full flex justify-between items-center bg-muted/20 p-2 rounded-md mb-3">
                    <span className="text-xs font-medium">Detalii</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => toggleSection(comanda.ID)}
                    >
                      {expandedSections[comanda.ID] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Combined collapsible content - always visible on desktop, collapsible on mobile */}
                  <div className={`${expandedSections[comanda.ID] ? 'block' : 'hidden'} md:block space-y-3`}>
                    {/* Gravare/Print section */}
                    <div className="flex items-center bg-muted/20 p-2 rounded-md">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground"><span className="md:inline hidden">Gravare:</span><span className="md:hidden inline">Grav.:</span></span>
                        {comanda.gravare ? (
                          <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center text-black dark:text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex items-center space-x-1 ml-3">
                        <span className="text-xs text-muted-foreground"><span className="md:inline hidden">Printare:</span><span className="md:hidden inline">Print.:</span></span>
                        {comanda.printare ? (
                          <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center text-black dark:text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>

                      <div className="ml-auto flex items-center space-x-1.5 justify-end">
                        {/*<a */}
                        {/*  href={`https://crm.actium.ro/api/generare-bon-debitare/${comanda.ID}`}*/}
                        {/*  target="_blank"*/}
                        {/*  rel="noopener noreferrer"*/}
                        {/*  className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center cursor-pointer"*/}
                        {/*>*/}
                        {/*  <Eye className="w-4 h-4 text-muted-foreground" />*/}
                        {/*</a>*/}
                        {/*<a */}
                        {/*  href={`https://crm.actium.ro/api/generare-bon-debitare/${comanda.ID}`}*/}
                        {/*  target="_blank"*/}
                        {/*  rel="noopener noreferrer"*/}
                        {/*  className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center cursor-pointer"*/}
                        {/*>*/}
                        {/*  <Printer className="w-4 h-4 text-muted-foreground" />*/}
                        {/*</a>*/}
                        {comanda.previzualizare_galerie && comanda.previzualizare_galerie.length > 0 && (
                          <div 
                            className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              setGalleryImages(comanda.previzualizare_galerie || []);
                              setShowGalleryModal(true);
                            }}
                            title="Previzualizare galerie"
                          >
                            <Gift className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div 
                          className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center cursor-pointer"
                          onClick={() => {
                            setCurrentOrder(comanda);
                            setShowProblemModal(true);
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Panoul inline din card a fost mutat sus, sub statusurile mari */}
                    {null}

                    {/* Product images section - grid cu maxim 6 rânduri */}
                    <div className="grid grid-cols-6  gap-2">
                      {comanda.produse_finale.map((produs, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-muted/10 rounded">
                          <div className="relative">
                            <img
                              src={produs.poza ? `https://darurialese.com/wp-content/uploads/${produs.poza}` : "/api/placeholder/48/48"}
                              alt="Product"
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {produs.quantity}
                            </div>
                          </div>
                        </div>
                      ))}
                      {comanda.produse_finale.length === 1 && (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={`ph-${i}`} className="flex items-center space-x-2">
                            <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                          </div>
                        ))
                      )}
                    </div>

                    {/* Graphic files section (grouped by Gravare and Printare; shown when logprogravare and files exist) */}
                    {comanda.logprogravare && Array.isArray(comanda.download_fisiere_grafica) && (
                      (() => {
                        // Group files by type based on extension
                        const gravareExt = ['svg', 'ai', 'dxf'];
                        const printExt = ['eps', 'pdf']; // include pdf as print candidate if present

                        const gravareFiles = comanda.download_fisiere_grafica.filter((file: any) => {
                          if (typeof file !== 'string') return false;
                          const fileName = file.includes('/') ? file.split('/').pop() : file;
                          const ext = (fileName?.split('.').pop() || '').toLowerCase();
                          return gravareExt.includes(ext);
                        });

                        const printFiles = comanda.download_fisiere_grafica.filter((file: any) => {
                          if (typeof file !== 'string') return false;
                          const fileName = file.includes('/') ? file.split('/').pop() : file;
                          const ext = (fileName?.split('.').pop() || '').toLowerCase();
                          return printExt.includes(ext);
                        });


                        const renderFileChip = (file: string, colorClass: string) => {
                          const fileName = file.includes('/') ? file.split('/').pop() || '' : file;
                          const baseName = fileName.replace(/\.[^.]+$/, ''); // remove extension
                          const downloadHref = `https://crm.actium.ro/api/download/${encodeToBase64(`https://darurialese.ro/wp-content/uploads/${file}`)}`;
                          return (
                            <a
                              key={file}
                              href={downloadHref}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-center gap-1 ${colorClass} px-2 py-2 rounded text-xs transition-colors w-full`}
                              title={`Descarcă fișier ${fileName}`}
                            >
                              <span className="w-4 h-4  rounded flex items-center justify-center text-white text-xs font-bold">🡇</span>

                            </a>
                          );
                        };

                        return (
                          <div className="bg-muted/10 p-2 rounded grid grid-cols-2 gap-2 border border-1 border-gray-300 dark:border-gray-800">

                            {(() => {
                              const gc = gravareFiles.length === 1 ? 'grid-cols-1' : gravareFiles.length === 2 ? 'grid-cols-2' : gravareFiles.length === 4 ? 'grid-cols-4' : 'grid-cols-3';
                              return (
                                <div className="mb-2">
                                  <div className="text-xs font-semibold mb-1">Gravare ({gravareFiles.length})</div>
                                  <div className={`grid gap-2 ${gc}`}>
                                    {gravareFiles.length > 0 ? (
                                      gravareFiles.map((f: string) => (
                                        <div key={f} className="min-w-0">{renderFileChip(f, 'bg-gray-700')}</div>
                                      ))
                                    ) : (
                                      Array.from({ length: 4 }).map((_, i) => (
                                        <div key={`grav-sk-${i}`} className="min-w-0">
                                          <div className="h-8  rounded  w-full" />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {(() => {
                              const pc = printFiles.length === 1 ? 'grid-cols-1' : printFiles.length === 2 ? 'grid-cols-2' : printFiles.length === 4 ? 'grid-cols-4' : 'grid-cols-3';
                              return (
                                <div>
                                  <div className="text-xs font-semibold mb-1">Printare ({printFiles.length})</div>
                                  <div className={`grid gap-2 ${pc}`}>
                                    {printFiles.length > 0 ? (
                                      printFiles.map((f: string) => (
                                        <div key={f} className="min-w-0">{renderFileChip(f, 'bg-green-600')}</div>
                                      ))
                                    ) : (
                                      Array.from({ length: 4 }).map((_, i) => (
                                        <div key={`print-sk-${i}`} className="min-w-0">
                                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()
                    )}

                    {/* Action buttons section */}
                    <div>
                      {comanda.logprogravare ? (
                        <div className="text-xs text-muted-foreground">
                          {/* Only show the button for production, dpd, fan, and client approval - hide for gravare and legatorie */}
                          {(zonaActiva !== 'productie' && zonaActiva !== 'legatorie') && (
                            <Button 
                              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-base"
                              onClick={() => handleMutaClick(comanda.ID)}
                              disabled={movingCommandId === comanda.ID}
                            >
                              {movingCommandId === comanda.ID ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Se procesează...
                                </div>
                              ) : (
                                "Muta ➦"
                              )}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>
                          {/* Only show the button for production, dpd, fan, and client approval */}
                          {(zonaActiva === 'gravare' || zonaActiva === 'dpd' || zonaActiva === 'fan' ) && (
                            <Button 
                              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 text-base"
                              onClick={() => handleIncepeDebitareClick(comanda.ID)}
                              disabled={startingCommandId === comanda.ID}
                            >
                              {startingCommandId === comanda.ID ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Se procesează...
                                </div>
                              ) : (
                                "Incepe procesul ➦"
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Docked Chat cu Grafica */}
      {showChat && (
        <div className="fixed inset-y-0 right-0 z-[80] w-[15vw]">
          <Card className="w-full h-full shadow-lg border border-border bg-card flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border bg-secondary text-secondary-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-semibold">Chat Grafica</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowChat(false)} aria-label="Închide chat">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Messages */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-background/60">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'eu' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${m.from === 'eu' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} px-3 py-2 rounded-2xl max-w-[220px] text-xs shadow-sm`}>
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className="text-[10px] opacity-70 mt-1 text-right">{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Input */}
            <form
              className="p-2 border-t border-border bg-card flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = chatInput.trim();
                if (!text) return;
                const mine = { from: 'eu' as const, text, time: nowTime() };
                setChatMessages((prev) => [...prev, mine]);
                setChatInput('');
                // Fake reply from Grafica
                setTimeout(() => {
                  setChatMessages((prev) => [
                    ...prev,
                    { from: 'grafica', text: 'Am notat. Revin în 2-3 minute cu fișierul actualizat. ✅', time: nowTime() },
                  ]);
                }, 1200);
              }}
            >
              <input
                type="text"
                className="flex-1 text-sm bg-background text-foreground border border-input rounded px-2 py-2 outline-none"
                placeholder="Scrie un mesaj..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-9 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
          {/* Subtle side toggle on left border */}
          <button
            className="absolute left-0 top-3/4 -translate-y-1/2 -translate-x-1/2 z-[81] w-9 h-9 rounded-full bg-secondary text-secondary-foreground shadow border border-border hover:opacity-90"
            onClick={() => setShowChat(false)}
            aria-label="Ascunde chat"
            title="Ascunde chat"
            type="button"
          >
            <MessageSquare className="w-4 h-4 m-auto" />
          </button>
        </div>
      )}
      {/* Floating toggle button (hidden when chat is open) */}
      {!showChat && (
        <Button
          className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 p-0 shadow-lg bg-primary text-primary-foreground hover:opacity-90"
          onClick={() => setShowChat(true)}
          aria-label="Deschide chat Grafica"
          title="Chat Grafica"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}

      {/* Problem reporting modal */}
      <Dialog open={showProblemModal} onOpenChange={setShowProblemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Problema comanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="zone">Zona</Label>
              <Select 
                value={problemZone} 
                onValueChange={setProblemZone}
              >
                <SelectTrigger id="zone">
                  <SelectValue placeholder="Selectează zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grafica">Grafica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produs cu probleme</Label>
              <Select 
                value={problemProduct} 
                onValueChange={setProblemProduct}
                disabled={!currentOrder}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Selectează produsul" />
                </SelectTrigger>
                <SelectContent>
                  {currentOrder?.produse_finale.map((produs, idx) => (
                    <SelectItem key={idx} value={produs.id_produs}>
                      {produs.nume}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departament</Label>
              <Select disabled>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Gravare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gravare">Gravare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descriere problemă</Label>
              <Textarea
                id="description"
                placeholder="Detaliază problema..."
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowProblemModal(false)}
            >
              Anulează
            </Button>
            <Button onClick={handleSubmitProblem}>
              Trimite task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery modal */}
      <Dialog open={showGalleryModal} onOpenChange={(open) => {
        setShowGalleryModal(open);
        if (!open) { setSelectedImage(null); setSelectedImageIndex(null); }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Previzualizare galerie</DialogTitle>
          </DialogHeader>
          {selectedImage ? (
            <div className="py-4 flex flex-col items-center">
              <div className="relative max-h-[70vh] overflow-hidden">
                {galleryImages.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-muted/60 hover:bg-muted/80 rounded-full p-2"
                      onClick={() => {
                        const len = galleryImages.length;
                        let idx = selectedImageIndex ?? galleryImages.findIndex((img) => `https://darurialese.ro/wp-content/uploads/${img}` === selectedImage);
                        if (idx < 0) idx = 0;
                        const prev = (idx - 1 + len) % len;
                        setSelectedImage(`https://darurialese.ro/wp-content/uploads/${galleryImages[prev]}`);
                        setSelectedImageIndex(prev);
                      }}
                      aria-label="Previous"
                      title="Previous"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-muted/60 hover:bg-muted/80 rounded-full p-2"
                      onClick={() => {
                        const len = galleryImages.length;
                        let idx = selectedImageIndex ?? galleryImages.findIndex((img) => `https://darurialese.ro/wp-content/uploads/${img}` === selectedImage);
                        if (idx < 0) idx = 0;
                        const next = (idx + 1) % len;
                        setSelectedImage(`https://darurialese.ro/wp-content/uploads/${galleryImages[next]}`);
                        setSelectedImageIndex(next);
                      }}
                      aria-label="Next"
                      title="Next"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                <img 
                  src={selectedImage}
                  alt="Imagine galerie mărită"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedImage(null)}
                className="mt-4"
              >
                Înapoi la galerie
              </Button>
            </div>
          ) : (
            <div className="py-4">
              <div className="grid grid-cols-3 gap-4">
                {galleryImages.map((image, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-square overflow-hidden rounded-md border border-border cursor-pointer"
                    onClick={() => { setSelectedImage(`https://darurialese.ro/wp-content/uploads/${image}`); setSelectedImageIndex(index); }}
                  >
                    <img 
                      src={`https://darurialese.ro/wp-content/uploads/${image}`}
                      alt={`Imagine galerie ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGalleryModal(false)}
            >
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Studiu modal */}
      <Dialog open={showStudiuModal} onOpenChange={setShowStudiuModal}>
        <DialogContent className="fixed right-0 top-0 left-auto h-screen max-h-screen translate-x-0 translate-y-0 rounded-none w-full sm:w-[520px] md:w-[320px] overflow-hidden p-0">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Studiu produse</div>
              <Button variant="ghost" size="sm" onClick={() => setShowStudiuModal(false)} aria-label="Închide">

              </Button>
            </div>
          </div>
          <div className="h-[calc(100vh-52px)] overflow-y-auto px-4 py-4">
            {isLoadingStudiu ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {studiuData.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-2">Nu există elemente de afișat.</div>
                ) : (
                  studiuData.map((item, idx) => {
                    const anexes = [
                      { key: 'anexa_wenge', label: 'Wenge' },
                      { key: 'anexa_alb', label: 'Alb' },
                      { key: 'anexa_natur', label: 'Natur' },
                      { key: 'anexa_plexi', label: 'Plexi' },
                      { key: 'anexa_print', label: 'Print' },
                      { key: 'anexa_gold', label: 'Gold' },
                      { key: 'anexa_argintiu', label: 'Argintiu' },
                      { key: 'anexa_plexi_gold', label: 'Plexi Gold' },
                      { key: 'anexa_plexi_negru', label: 'Plexi Negru' },
                      { key: 'anexa_plexi_alb', label: 'Plexi Alb' },
                      { key: 'anexa_plexi_alb_satin', label: 'Plexi Alb Satin' },
                    ];
                    const imageUrl = item?.poza_prezentare ? `https://crm.actium.ro/uploads/researchdevelopment/${item.poza_prezentare}` : '';
                    return (
                      <Card key={idx} className="p-4">
                        <div className="flex flex-col gap-2">
                          <span>{item?.titlu_custom || 'Fără titlu'}</span>

                          {(() => {
                            if (item?.tip_produs) {
                              const s = String(item.tip_produs).replace(/-/g, ' ');
                              return <div className="text-xs text-muted-foreground truncate mb-2 ">{s.charAt(0).toUpperCase() + s.slice(1)}</div>;
                            }
                            return <div className="text-xs text-muted-foreground truncate ">-</div>;
                          })()}
                          <div className="w-full h-52 bg-muted/30 rounded overflow-hidden flex items-center justify-center">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item?.titlu_custom || 'poza prezentare'} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xs text-muted-foreground">Fără imagine</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                        <div className="">
                              <div className="truncate">
                                <div className="text-sm font-semibold truncate gap-2">

                                  <div className="flex items-center gap-1">
                                    {item?.am_debitat == 1 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/40" title="Debitat">
                                        {(item?.am_debitat === true || item?.am_debitat === 1 || item?.am_debitat === '1') ? (
                                            <Check className="w-3 h-3" />
                                        ) : (
                                            <X className="w-3 h-3" />
                                        )}
                                          <span>Debitat</span>
                                      </span>
                                    )}

                                    {/* Printat: show button when null AND print files exist, icon otherwise */}
                                    {item?.am_printat == null && item?.grafica_produs_print && Array.isArray(item.grafica_produs_print) && item.grafica_produs_print.length > 0 ? (
                                      <Button
                                        size="xs"
                                        className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white w-full"
                                        onClick={() => handleMarkStudiuPrintat(item.id)}
                                        disabled={!!studiuMarkLoading[item.id]}
                                        title="Marchează ca printat"
                                      >
                                        {studiuMarkLoading[item.id] ? '...' : 'Am printat'}
                                      </Button>
                                    ) : item?.am_printat != null ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/40" title="Printat">
                                        {(item?.am_printat === true || item?.am_printat === 1 || item?.am_printat === '1') ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <X className="w-3 h-3" />
                                        )}
                                        <span>Printat</span>
                                      </span>
                                    ) : null}

                                    {/* Gravat: show button when null AND gravare file exists, icon otherwise */}
                                    {item?.am_gravat == null && item?.grafica_produs_gravare ? (
                                      <Button
                                        size="xs"
                                        className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleMarkStudiuGravat(item.id)}
                                        disabled={!!studiuMarkLoading[item.id]}
                                        title="Marchează ca gravat"
                                      >
                                        {studiuMarkLoading[item.id] ? '...' : 'Am gravat'}
                                      </Button>
                                    ) : item?.am_gravat != null ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/40" title="Gravat">
                                        {(item?.am_gravat === true || item?.am_gravat === 1 || item?.am_gravat === '1') ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <X className="w-3 h-3" />
                                        )}
                                        <span>Gravat</span>
                                      </span>
                                    ) : null}


                                  </div>

                                  {/* Produs Fizic: show button only when all three conditions are met */}
                                  {((item?.am_gravat === true || item?.am_gravat === 1 || item?.am_gravat === '1') ||
                                          (item?.am_gravat === null && !item?.grafica_produs_gravare)) &&
                                      (item?.am_printat === true || item?.am_printat === 1 || item?.am_printat === '1') &&
                                      (item?.am_debitat === true || item?.am_debitat === 1 || item?.am_debitat === '1') && (
                                          <Button
                                              size="xs"
                                              className="h-6 px-2  bg-blue-600 hover:bg-blue-700 text-white w-full mt-2"
                                              onClick={() => handleMarkStudiuProdusFizic(item.id)}
                                              disabled={!!studiuMarkLoading[item.id]}
                                              title="Marchează ca produs fizic realizat"
                                          >
                                            {studiuMarkLoading[item.id] ? '...' : 'Am realizat produsul fizic'}
                                          </Button>
                                      )}
                                </div>

                              </div>
                            </div>
                            <div className="mt-3 overflow-x-auto">
                              <div className="mt-4">
                                <div className="text-sm font-medium mb-2">Fișiere disponibile:</div>
                                <div className=" gap-2">
                                {/* Display download links for print files */}
                                {item?.grafica_produs_print && Array.isArray(item.grafica_produs_print) && item.grafica_produs_print.length > 0 && 
                                  item.grafica_produs_print.map((file, i) => (
                                    <a
                                      key={i}
                                      href={`https://crm.actium.ro/uploads/researchdevelopment/${file}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                                      title={`Download print: ${file}`}
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>Download print</span>
                                    </a>
                                  ))
                                }

                                {/* Display download link for gravare file */}
                                {item?.grafica_produs_gravare && (
                                  <a
                                    href={`https://crm.actium.ro/uploads/researchdevelopment/${item.grafica_produs_gravare}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                                    title={`Download gravare: ${item.grafica_produs_gravare}`}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Download gravare</span>
                                  </a>
                                )}

                                {/* Display download link for template AI file */}
                                {/*{item?.template_ai && (*/}
                                {/*  <a*/}
                                {/*    href={`https://crm.actium.ro/uploads/researchdevelopment/${item.template_ai}`}*/}
                                {/*    target="_blank"*/}
                                {/*    rel="noopener noreferrer"*/}
                                {/*    download*/}
                                {/*    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"*/}
                                {/*    title={`Download template: ${item.template_ai}`}*/}
                                {/*  >*/}
                                {/*    <Download className="w-4 h-4" />*/}
                                {/*    <span>Download template</span>*/}
                                {/*  </a>*/}
                                {/*)}*/}

                                {/* Display download link for grafica produs editabil */}
                                {/*{item?.grafica_produs_editabil && (*/}
                                {/*  <a*/}
                                {/*    href={`https://crm.actium.ro/uploads/researchdevelopment/${item.grafica_produs_editabil}`}*/}
                                {/*    target="_blank"*/}
                                {/*    rel="noopener noreferrer"*/}
                                {/*    download*/}
                                {/*    className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"*/}
                                {/*    title={`Download grafică editabilă: ${item.grafica_produs_editabil}`}*/}
                                {/*  >*/}
                                {/*    <Download className="w-4 h-4" />*/}
                                {/*    <span>Download grafică editabilă</span>*/}
                                {/*  </a>*/}
                                {/*)}*/}
                                </div>

                                {/* Show message if no files are available */}
                                {!item?.grafica_produs_print && !item?.grafica_produs_gravare && !item?.template_ai && !item?.grafica_produs_editabil && (
                                  <div className="text-sm text-muted-foreground">Nu există fișiere disponibile pentru descărcare.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory modal */}
      <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
        <DialogContent className="sm:max-w-5xl fixed  left-1/2 transform  rounded-t-xl rounded-b-none max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Stocuri Sistem Gravare</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex-grow overflow-hidden">
            {isLoadingInventory ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {!isEditMode ? (
                      <Button 
                        onClick={() => setIsEditMode(true)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Adauga stocuri curente
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={handleSaveStockValues}
                          className="bg-green-500 hover:bg-green-600"
                          disabled={isSavingStock || Object.keys(newStockValues).length === 0}
                        >
                          {isSavingStock ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Se salvează...
                            </div>
                          ) : (
                            "Salveaza stocul curent"
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsEditMode(false);
                            setNewStockValues({});
                          }}
                          disabled={isSavingStock}
                        >
                          Anulează
                        </Button>
                        <div className="text-xs text-gray-400 ml-2">
                          {Object.keys(newStockValues).length} produse modificate
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={inventorySearchTerm}
                        onChange={(e) => setInventorySearchTerm(e.target.value)}
                        placeholder="Caută în stocuri..."
                        className="p-2 border rounded text-sm w-64 bg-background text-foreground border-input placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-auto max-h-[calc(90vh-160px)]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="py-2">Nume</TableHead>
                        <TableHead className="py-2">Stoc (UM)</TableHead>
                        {isEditMode && <TableHead className="py-2">Stoc Nou</TableHead>}
                        <TableHead className="py-2">Status</TableHead>
                        <TableHead className="py-2">Minim</TableHead>
                        {/*<TableHead className="py-2">Intrari</TableHead>*/}
                        {/*<TableHead className="py-2">Total</TableHead>*/}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData
                        .filter(item => {
                          if (!inventorySearchTerm) return true;
                          const searchTermLower = inventorySearchTerm.toLowerCase();
                          return (
                            item.nume.toLowerCase().includes(searchTermLower) ||
                            item.um.toLowerCase().includes(searchTermLower) ||
                            item.numar_stoc.toString().includes(searchTermLower) ||
                            item.minim.toString().includes(searchTermLower)
                          );
                        })
                        .map((item, index) => {
                        // Calculate total RON from all entries
                        const totalRon = item.intrari?.reduce((sum: number, entry: any) => sum + entry.total, 0) || 0;

                        // Determine status based on stock vs minimum
                        const status = item.numar_stoc <= item.minim 
                          ? 'Stoc critic' 
                          : item.numar_stoc <= item.minim * 1.5 
                            ? 'Stoc redus' 
                            : 'Stoc suficient';

                        // Get the current value for this item (if it exists in newStockValues)
                        const currentValue = newStockValues[item.id] !== undefined 
                          ? newStockValues[item.id].toString() 
                          : '';

                        return (
                          <TableRow key={index} className="text-xs">
                            <TableCell className="font-medium py-1.5">{item.nume}</TableCell>
                            <TableCell className="py-1.5">{item.numar_stoc} {item.um}</TableCell>
                            {isEditMode && (
                              <TableCell className="py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentValue}
                                  onChange={(e) => handleStockValueChange(item.id, e.target.value)}
                                  placeholder={item.numar_stoc.toString()}
                                  className="w-20 p-1 border rounded bg-background text-foreground border-input placeholder:text-muted-foreground"
                                  disabled={isSavingStock}
                                />
                                <span className="ml-1">{item.um}</span>
                              </TableCell>
                            )}
                            <TableCell className="py-1.5">
                              <div className="flex items-center">
                                <div className={`h-4 w-4 rounded-full ${
                                  status === 'Stoc critic' 
                                    ? 'bg-red-500' 
                                    : status === 'Stoc redus' 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`}></div>
                                <span className="sr-only">{status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5">{item.minim}</TableCell>
                            {/*<TableCell className="py-1.5">{item.intrari?.length || 0}</TableCell>*/}
                            {/*<TableCell className="py-1.5">{totalRon.toFixed(2)} RON</TableCell>*/}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowInventoryModal(false)}
              disabled={isSavingStock}
            >
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
