import React, { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Info, Package, AlertTriangle, ShoppingCart, Eye, Printer, Gift, Database, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, MessageSquare, Send, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Comanda, Produs, StatItem } from "@/types/dashboard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateFactura, generateBon, mutaLegatorie } from "@/api/orders";
import { Progress } from "@/components/ui/progress";

// Hint component showing incoming counts from other zones when current zone is empty
const API_BASE_HINT = 'https://crm.actium.ro';
const COMENZI_API_HINT_URL = `${API_BASE_HINT}/api/comenzi-daruri-alese-legatorie`;

function IncomingHint({ zonaActiva }: { zonaActiva: string }) {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<{ gravare: number; debitare: number } | null>(null);

  useEffect(() => {
    const zonesToWatch = ['legatorie', 'dpd', 'fan'];
    if (!zonesToWatch.includes((zonaActiva || '').toLowerCase())) return;

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        };
        const [gRes, dRes] = await Promise.all([
          fetch(`${COMENZI_API_HINT_URL}/gravare`, { headers }).catch(() => null),
          fetch(`${COMENZI_API_HINT_URL}/debitare`, { headers }).catch(() => null),
        ]);
        const gJson = gRes && gRes.ok ? await gRes.json().catch(() => []) : [];
        const dJson = dRes && dRes.ok ? await dRes.json().catch(() => []) : [];
        if (!cancelled) {
          setCounts({
            gravare: Array.isArray(gJson) ? gJson.length : 0,
            debitare: Array.isArray(dJson) ? dJson.length : 0,
          });
        }
      } catch (e) {
        if (!cancelled) setCounts({ gravare: 0, debitare: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();

    return () => { cancelled = true; };
  }, [zonaActiva]);

  const zonesToWatch = ['legatorie', 'dpd', 'fan'];
  if (!zonesToWatch.includes((zonaActiva || '').toLowerCase())) return null;

  if (loading) {
    return (
      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
        Se verifică comenzile ce urmează din alte zone...
      </div>
    );
  }

  if (counts) {
    return (
      <div className="mt-3">
        <div className="text-sm text-muted-foreground mb-2">
          Fii pe fază, urmează <span className="font-semibold text-foreground">{counts.gravare}</span> din gravare și <span className="font-semibold text-foreground">{counts.debitare}</span> din debitare.
        </div>
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-base font-bold shadow">
                {counts.gravare}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Gravare</div>
            </div>
            <div className="relative w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-primary to-green-600 animate-pulse opacity-70"></div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-base font-bold shadow">
                {counts.debitare}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Debitare</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

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
  const [problemProducts, setProblemProducts] = useState<string[]>([]);
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

    // Per-order selected preview index for large preview area
    const [previewIndexByOrder, setPreviewIndexByOrder] = useState<Record<number, number>>({});

    const getSelectedPreviewIndex = (orderId: number, total: number) => {
      const idx = previewIndexByOrder[orderId];
      if (typeof idx === 'number' && idx >= 0 && idx < total) return idx;
      return 0;
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

    filtered = filtered.sort((a, b) => {
      if (a.logprolegatorie && !b.logprolegatorie) return -1;
      if (!a.logprolegatorie && b.logprolegatorie) return 1;
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


  // Function to fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setIsLoadingInventory(true);
      setIsEditMode(false);
      setNewStockValues({});
      setInventorySearchTerm("");

      const response = await fetch('https://actium.ro/api/financiar/lista-raport-stocuri/sistem:legatorie');

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
      let produseText = '';
      if (currentOrder && Array.isArray(currentOrder.produse_finale) && problemProducts.length > 0) {
        const selectedNames = currentOrder.produse_finale
          .filter((p: any) => problemProducts.includes(String(p?.id_produs)))
          .map((p: any) => p?.nume || `Produs ${p?.id_produs}`);
        produseText = selectedNames.length > 0 ? selectedNames.join(', ') : 'Produse nespecificate';
      } else {
        produseText = 'Produse nespecificate';
      }
      const descriere = problemDescription?.trim() || '(fără descriere)';
      const msg = `Problema comandă ${orderId}\nZona: ${zona}\nProduse: ${produseText}\nDepartament: Legatorie\nDescriere: ${descriere}`;
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
    setProblemProducts([]);
    setProblemDescription("");
    setShowProblemModal(false);
  };

  // Fake API helpers for the move workflow (invoice -> receipt -> move)
  const fakeApiDelay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const fakeGenFactura = async () => {
    await fakeApiDelay(1000);
    // return fake invoice details
    return { serie: 'PG', numar: 203 };
  };
  const fakeGenBon = async () => {
    await fakeApiDelay(900);
    return { id: 'BON-PG-203', status: 'emis' };
  };

  // Modal state for "Muta" progress
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveForOrderId, setMoveForOrderId] = useState<number | null>(null);
  type MoveStep = 'idle' | 'factura-start' | 'factura-done' | 'bon-start' | 'bon-done' | 'muta-start' | 'muta-done' | 'error';
  const [moveStep, setMoveStep] = useState<MoveStep>('idle');
  const [moveInfo, setMoveInfo] = useState<{ serie?: string; numar?: number; bonId?: string; error?: string }>({});

  // Function to handle "Muta" button click
  const handleMutaClick = async (comandaId: number) => {
    try {
      setMovingCommandId(comandaId);
      setMoveForOrderId(comandaId);
      setMoveStep('factura-start');
      setShowMoveModal(true);

      // 1) Generate invoice (real API)
      const invRes: any = await generateFactura(comandaId);
      if (!invRes?.ok) {
        throw new Error(invRes?.message || 'Eroare la generarea facturii');
      }
      const invData: any = invRes?.invoice_data || {};
      setMoveInfo({
        serie: invData?.serie ?? invData?.series ?? '—',
        numar: invData?.numar ?? invData?.number ?? undefined,
      });
      setMoveStep('factura-done');

      // 2) Generate receipt (real API)
      setMoveStep('bon-start');
      const bonRes: any = await generateBon(comandaId);
      if (!bonRes?.ok) {
        throw new Error(bonRes?.message || 'Eroare la generarea bonului');
      }
      const receiptPath: string | undefined = bonRes?.receipt_path;
      setMoveInfo((prev) => ({ ...prev, bonId: receiptPath || 'bon' }));
      setMoveStep('bon-done');

      // 3) Move order (real API)
      setMoveStep('muta-start');
      await mutaLegatorie(comandaId, userId);

      setMoveStep('muta-done');
      // Refresh orders list to reflect the move
      try { refreshComenzi(); } catch (_) {}
      // Close after a short delay to let user see the checks
      setTimeout(() => setShowMoveModal(false), 800);
    } catch (error: any) {
      console.error('Eroare la fluxul de mutare:', error);
      setMoveStep('error');
      setMoveInfo((prev) => ({ ...prev, error: error?.message || 'Eroare necunoscută' }));
    } finally {
      setMovingCommandId(null);
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

      const response = await fetch(`https://crm.actium.ro/api/incepe-legatorie/${comandaId}/${userId}`, {
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
            ? { ...comanda, logprolegatorie: true }
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
      <main className={`${showChat ? 'pr-[15vw]' : ''} ml-32 mt-20 flex-1 backgroundculiniute pb-16`}>
        <div className="sticky top-20 z-30 grid grid-cols-1 sm:grid-cols-5 gap-2 relative p-3 border border-b border-border bg-card">
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


        {/* Panou anexe produs - vizibil când este selectat un produs */}
        {expandedProdPanel && (() => {
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

        {/*<div className="mb-6 mx-3">*/}
        {/*  /!* Mobile view: flex layout *!/*/}
        {/*  <div className="flex flex-col sm:hidden gap-3">*/}
        {/*    <div className="flex items-center gap-2 w-full">*/}
        {/*      <input*/}
        {/*        type="text"*/}
        {/*        value={searchTerm}*/}
        {/*        onChange={(e) => setSearchTerm(e.target.value)}*/}
        {/*        placeholder="Caută comenzi după nume sau ID..."*/}
        {/*        className="p-2 border rounded-md w-full text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"*/}
        {/*      />*/}
        {/*    </div>*/}
        {/*  </div>*/}

        {/*  /!* Desktop view: 3-grid layout (hidden in favor of bottom fixed bar) *!/*/}
        {/*  <div className="hidden">*/}

        {/*      /!* Middle grid: Inventory and Studiu buttons *!/*/}
        {/*      <div className="flex gap-2 items-stretch">*/}
        {/*          <Card*/}
        {/*              className="p-2 cursor-pointer whitespace-nowrap transition-colors h-full flex items-center"*/}
        {/*              onClick={() => {*/}
        {/*                  fetchInventoryData();*/}
        {/*                  setShowInventoryModal(true);*/}
        {/*              }}*/}
        {/*          >*/}
        {/*              <div className="flex items-center gap-2">*/}
        {/*                  <div className="w-6 h-6  rounded flex items-center justify-center">*/}
        {/*                      <Database className="w-4 h-4 text-black dark:text-white" />*/}
        {/*                  </div>*/}
        {/*                  <span className="text-xs">Stocuri</span>*/}
        {/*              </div>*/}
        {/*          </Card>*/}
        {/*          /!* Filtru: All / Cu gravare / Cu printare *!/*/}
        {/*          /!*<Card className="px-3 py-2 flex items-center">*!/*/}
        {/*          /!*  <div className="flex items-center gap-3 text-xs">*!/*/}
        {/*          /!*    <span className="text-muted-foreground">Filtru:</span>*!/*/}
        {/*          /!*    <label className="inline-flex items-center gap-1 cursor-pointer">*!/*/}
        {/*          /!*      <input*!/*/}
        {/*          /!*        type="radio"*!/*/}
        {/*          /!*        name="tipGrafica"*!/*/}
        {/*          /!*        value="all"*!/*/}
        {/*          /!*        checked={filterTipGrafica === 'all'}*!/*/}
        {/*          /!*        onChange={() => setFilterTipGrafica('all')}*!/*/}
        {/*          /!*        className="accent-blue-600"*!/*/}
        {/*          /!*      />*!/*/}
        {/*          /!*      <span>All</span>*!/*/}
        {/*          /!*    </label>*!/*/}
        {/*          /!*    <label className="inline-flex items-center gap-1 cursor-pointer">*!/*/}
        {/*          /!*      <input*!/*/}
        {/*          /!*        type="radio"*!/*/}
        {/*          /!*        name="tipGrafica"*!/*/}
        {/*          /!*        value="gravare"*!/*/}
        {/*          /!*        checked={filterTipGrafica === 'gravare'}*!/*/}
        {/*          /!*        onChange={() => setFilterTipGrafica('gravare')}*!/*/}
        {/*          /!*        className="accent-blue-600"*!/*/}
        {/*          /!*      />*!/*/}
        {/*          /!*      <span>Cu gravare</span>*!/*/}
        {/*          /!*    </label>*!/*/}
        {/*          /!*    <label className="inline-flex items-center gap-1 cursor-pointer">*!/*/}
        {/*          /!*      <input*!/*/}
        {/*          /!*        type="radio"*!/*/}
        {/*          /!*        name="tipGrafica"*!/*/}
        {/*          /!*        value="printare"*!/*/}
        {/*          /!*        checked={filterTipGrafica === 'printare'}*!/*/}
        {/*          /!*        onChange={() => setFilterTipGrafica('printare')}*!/*/}
        {/*          /!*        className="accent-blue-600"*!/*/}
        {/*          /!*      />*!/*/}
        {/*          /!*      <span>Cu printare</span>*!/*/}
        {/*          /!*    </label>*!/*/}
        {/*          /!*  </div>*!/*/}
        {/*          /!*</Card>*!/*/}
        {/*      </div>*/}

        {/*    /!* Left grid: Search input *!/*/}
        {/*    <div className="flex items-center">*/}
        {/*      <input*/}
        {/*        type="text"*/}
        {/*        value={searchTerm}*/}
        {/*        onChange={(e) => setSearchTerm(e.target.value)}*/}
        {/*        placeholder="Caută comenzi după nume sau ID..."*/}
        {/*        className="p-2 border rounded-md w-full text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"*/}
        {/*      />*/}
        {/*    </div>*/}



        {/*    /!* Right grid: Shipping dates *!/*/}
        {/*    <div className="flex justify-end">*/}
        {/*      <div className="flex flex-wrap gap-1">*/}
        {/*        {uniqueShippingDates.map((date, index) => (*/}
        {/*          <button*/}
        {/*            key={index}*/}
        {/*            onClick={() => setSelectedShippingData(selectedShippingData === date ? null : date)}*/}
        {/*            className={`px-2 py-1 text-xs rounded-md transition-colors ${*/}
        {/*              selectedShippingData === date */}
        {/*                ? 'bg-primary text-primary-foreground' */}
        {/*                : 'bg-secondary text-secondary-foreground hover:opacity-90'*/}
        {/*            }`}*/}
        {/*          >*/}
        {/*            {date}*/}
        {/*          </button>*/}
        {/*        ))}*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  </div>*/}
        {/*  /!*{selectedShippingData && (*!/*/}
        {/*  /!*    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">*!/*/}
        {/*  /!*      <div className="flex items-center gap-2">*!/*/}
        {/*  /!*        <span className="text-blue-700 text-sm font-medium">Filtrare după data de expediere:</span>*!/*/}
        {/*  /!*        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{selectedShippingData}</span>*!/*/}
        {/*  /!*      </div>*!/*/}
        {/*  /!*      <button*!/*/}
        {/*  /!*          onClick={() => setSelectedShippingData(null)}*!/*/}
        {/*  /!*          className="p-1 bg-blue-200 hover:bg-blue-300 rounded-full flex items-center justify-center"*!/*/}
        {/*  /!*      >*!/*/}
        {/*  /!*        <X size={16} className="text-blue-700" />*!/*/}
        {/*  /!*      </button>*!/*/}
        {/*  /!*    </div>*!/*/}
        {/*  /!*)}*!/*/}

        {/*</div>*/}



        {isLoading && <div className="p-4">Se încarcă statisticile...</div>}

        {isLoadingComenzi && (
          <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md z-50 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <p className="text-sm">Se actualizează...</p>
          </div>
        )}

        <div className="space-y-4 mx-3 ">
          {comenzi.length === 0 && !isLoadingComenzi && (
            <Card className="p-10 text-center max-w-md mx-auto mt-24">
              <div className="mx-auto mb-6 h-24 w-24 text-muted-foreground">
                <svg viewBox="0 0 100 100" className="h-24 w-24">
                  <g className="animate-spin" style={{ transformOrigin: '50% 50%' }}>
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="6 6" className="opacity-30" />
                  </g>
                  <g className="animate-bounce">
                    <rect x="32" y="34" width="36" height="28" rx="4" ry="4" fill="currentColor" className="opacity-60" />
                    <path d="M32 42 L50 32 L68 42" fill="currentColor" className="opacity-80" />
                  </g>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-1">Nu există comenzi pentru zona selectată</h3>
              <p className="text-base text-muted-foreground">Verifică mai târziu — te anunțăm ce urmează.</p>
              {/* Incoming from other zones hint */}
              <div className="mt-3">
                <IncomingHint zonaActiva={zonaActiva} />
              </div>
            </Card>
          )}

          {comenzi.length > 0 && displayedComenzi.length === 0 && (
            <Card className="p-10 text-center max-w-md mx-auto">
              <div className="mx-auto mb-6 h-24 w-24 text-muted-foreground">
                <svg viewBox="0 0 100 100" className="h-24 w-24">
                  <g className="animate-spin" style={{ transformOrigin: '50% 50%' }}>
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="6 6" className="opacity-30" />
                  </g>
                  <g className="animate-bounce">
                    <rect x="32" y="34" width="36" height="28" rx="4" ry="4" fill="currentColor" className="opacity-60" />
                    <path d="M32 42 L50 32 L68 42" fill="currentColor" className="opacity-80" />
                  </g>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-1">Nu s-au găsit comenzi potrivite filtrului</h3>
              <p className="text-base text-muted-foreground">
                {selectedProductId && selectedShippingData 
                  ? "Nu există comenzi cu produsul și data selectate. Modifică filtrul și încearcă din nou." 
                  : selectedShippingData 
                    ? "Nu există comenzi cu data de expediere selectată. Modifică filtrul și încearcă din nou." 
                    : "Nu există comenzi cu produsul selectat. Modifică filtrul și încearcă din nou."}
              </p>
            </Card>
          )}

            {displayedComenzi.length > 0 && (
                <div
                    className={`columns-1 md:columns-1 gap-x-6`}
                >
                    {displayedComenzi.map((comanda) => (
                        <div
                            key={comanda.ID}
                            className={`p-0 `}
                        >

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

                  {/* Combined content remade into 2-column layout (main + aside) */}
                  <div className={`${expandedSections[comanda.ID] ? 'block' : 'hidden'} md:block`}>
                    <div className=" mx-auto px-2">
                      <header className="mb-6" />
                      <div className="grid grid-cols-4 gap-6">
                          <aside className="col-span-1  md:sticky md:top-[168px]  h-fit self-start">
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

                              {/* Alerte (warning) */}
                              {(() => {
                                  const ad: any = (comanda as any)?.anexe_diferite_comanda;
                                  const hasAnexeDiferite = (ad && (ad.anexe_diferite_comanda === '1' || ad.anexe_diferite_comanda === 1 || ad.anexe_diferite_comanda === true))
                                      || ad === '1' || ad === 1 || ad === true;

                                  const hasCantitateDiferita = Array.isArray(comanda.produse_finale)
                                      && comanda.produse_finale.some((p: any) => {
                                          const q = typeof p?.quantity === 'string' ? parseFloat(p.quantity) : p?.quantity;
                                          return Number(q) > 1;
                                      });

                                  const ap: any = (comanda as any)?.atentie_pix;
                                  const hasAtentiePix = ap === '1' || ap === 1 || ap === true;

                                  // Licheni: poate veni ca obiect { licheni_diferiti: '1' } sau alte forme
                                  const al: any = (comanda as any)?.atentie_licheni;
                                  const licheniObj = (al && typeof al === 'object') ? al : null;
                                  const licheniDiferitiRaw = licheniObj ? (licheniObj as any).licheni_diferiti : (al as any);
                                  const hasAtentieLicheniDiferiti = (licheniDiferitiRaw === '1' || licheniDiferitiRaw === 1 || licheniDiferitiRaw === true);

                                  if (!hasAnexeDiferite && !hasCantitateDiferita && !hasAtentiePix && !hasAtentieLicheniDiferiti) return null;

                                  return (
                                      <section aria-live="polite">
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
                                                  <div className="mb-2 rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                                                      Atentie: Pix!
                                                  </div>
                                              )}
                                              {hasAtentieLicheniDiferiti && (
                                                  <div className="rounded-md border px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                                                      Atentie: Licheni diferiți!
                                                  </div>
                                              )}
                                          </div>
                                      </section>
                                  );
                              })()}

                              {/* Motiv refăcut (danger) */}
                              {(() => {
                                  const rf: any = (comanda as any)?.refacut;
                                  const isRefacut = rf === '1' || rf === 1 || rf === true;
                                  const motiv = (comanda as any)?.motiv_refacut;
                                  const motivText = typeof motiv === 'string' ? motiv.trim() : '';
                                  if (!isRefacut || !motivText) return null;
                                  return (
                                      <section>
                                          <div className=" mt-2 rounded-md border px-3 py-2 text-xs font-medium bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">
                                              Motiv refăcut: {motivText}
                                          </div>
                                      </section>
                                  );
                              })()}

                              {/* Grid info */}
                              <section className="grid grid-cols-2 gap-4 text-xs bg-card border border-border border-b-0  p-2 rounded-t-lg mt-2">
                                  <div className="flex flex-col">
                                      <span className="text-muted-foreground">Expediere</span>
                                      <span className="font-semibold">
                                {formatDate(comanda.expediere).split(' ')[0].replace(',', '')}
                              </span>
                                  </div>


                                  <div className="flex flex-col">
                                      <span className="text-muted-foreground">Preț</span>
                                      <span className="font-bold">{comanda.order_total_formatted} ({comanda.total_buc} buc)</span>
                                  </div>

                              </section>

                              {/* Gravare/Printare (stânga) + Acțiuni (dreapta) */}
                              <section className="flex items-center justify-between gap-4 bg-card border border-border rounded-b-lg p-2 mb-2">
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">Gravare</span>
                                          {comanda.gravare ? (
                                              <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center text-black dark:text-white">
                                                  <Check className="w-4 h-4" />
                                              </div>
                                          ) : (
                                              <X className="w-3.5 h-3.5 text-gray-400" />
                                          )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">Printare</span>
                                          {comanda.printare ? (
                                              <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center text-black dark:text-white">
                                                  <Check className="w-4 h-4" />
                                              </div>
                                          ) : (
                                              <X className="w-3.5 h-3.5 text-gray-400" />
                                          )}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      {comanda.previzualizare_galerie && comanda.previzualizare_galerie.length > 0 && (
                                          <button
                                              type="button"
                                              className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center"
                                              onClick={() => { setGalleryImages(comanda.previzualizare_galerie || []); setShowGalleryModal(true); }}
                                              aria-label="Previzualizare galerie"
                                          >
                                              <Gift className="w-4 h-4 text-muted-foreground" />
                                          </button>
                                      )}
                                      <button
                                          type="button"
                                          className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center"
                                          onClick={() => { setCurrentOrder(comanda); setShowProblemModal(true); }}
                                          aria-label="Raportează problemă"
                                      >
                                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                  </div>
                              </section>

                              {/* Cadou din comandă (dacă există) */}
                              {(() => {
                                  const pcn: any = (comanda as any)?.produs_cadou_nou;
                                  if (!pcn) return null;
                                  const slug = typeof pcn?.produs_cadou_nou === 'string' ? pcn.produs_cadou_nou.trim() : '';
                                  const personal = typeof pcn?.personalizare_cadou_comanda === 'string' ? pcn.personalizare_cadou_comanda.trim() : '';
                                  const imgUrl = slug ? `https://darurialese.com/wp-content/themes/woodmart-child/img/cadouri-comanda/${slug}.png` : '';
                                  if (!imgUrl && !personal) return null;
                                  return (
                                      <section className="flex items-center gap-3 bg-card border border-border rounded-md p-2 mb-2">
                                          {imgUrl ? (
                                              <img src={imgUrl} alt="Cadou din comandă" className="w-14 h-14 rounded-md border object-contain bg-background" />
                                          ) : null}
                                          {personal ? (
                                              <div className="text-xs leading-tight">
                                                  <div className="text-muted-foreground">Personalizare cadou</div>
                                                  <div className="font-medium break-words">{personal}</div>
                                              </div>
                                          ) : null}
                                      </section>
                                  );
                              })()}


                              {/* CTA desktop în aside */}
                              <section>
                                  {comanda.logprolegatorie ? (
                                      (zonaActiva !== 'productie' && zonaActiva !== 'gravare') && (
                                          <Button
                                              className="w-full py-4 rounded-2xl shadow font-medium bg-green-500 hover:bg-green-600"
                                              onClick={() => handleMutaClick(comanda.ID)}
                                              disabled={movingCommandId === comanda.ID}
                                          >
                                              {movingCommandId === comanda.ID ? 'Se procesează...' : 'Muta ➦'}
                                          </Button>
                                      )
                                  ) : (
                                      (zonaActiva === 'legatorie' || zonaActiva === 'dpd' || zonaActiva === 'fan') && (
                                          <Button
                                              className="w-full py-4 rounded-2xl shadow font-medium bg-orange-500 hover:bg-orange-600"
                                              onClick={() => handleIncepeDebitareClick(comanda.ID)}
                                              disabled={startingCommandId === comanda.ID}
                                          >
                                              {startingCommandId === comanda.ID ? 'Se procesează...' : 'Începe procesul →'}
                                          </Button>
                                      )
                                  )}
                              </section>
                          </aside>

                          <main className="col-span-3 space-y-4">

                          {/* Produse în format 2 coloane (preview stânga, produs dreapta) */}
                          <section className={`space-y-4 bg-white border ${((comanda as any)?.refacut === '1' || (comanda as any)?.refacut === 1 || (comanda as any)?.refacut === true) && (typeof (comanda as any)?.motiv_refacut === 'string' && (comanda as any)?.motiv_refacut.trim() !== '') ? 'border-red-500' : 'border-border'} rounded-lg p-4 relative`}>
                            {!comanda.logprolegatorie && zonaActiva !== 'productie' && zonaActiva !== 'gravare' && (
                              <div className="pointer-events-none sticky top-1/2 z-10 -translate-y-1/2 transform">
                                <div className="w-full flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleIncepeDebitareClick(comanda.ID)}
                                    className="pointer-events-auto rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-lg ring-4 ring-orange-500/20 animate-pulse"
                                    title="Începe comanda"
                                    aria-label="Începe comanda"
                                  >
                                    <PlayCircle className="w-10 h-10 md:w-12 md:h-12" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {comanda.produse_finale.map((produs, idx) => {
                              const title = produs?.nume || 'Produs';
                              const qty = (produs as any)?.quantity ?? '1';
                              const productImg = produs?.poza ? `https://darurialese.com/wp-content/uploads/${produs.poza}` : '/api/placeholder/640/360';
                              const hasPrev = Array.isArray(comanda.previzualizare_galerie) && comanda.previzualizare_galerie.length > 0;
                              const prevCandidate = hasPrev && comanda.previzualizare_galerie[idx] ? comanda.previzualizare_galerie[idx] : (hasPrev ? comanda.previzualizare_galerie[0] : null);
                              const previewImg = prevCandidate ? `https://darurialese.ro/wp-content/uploads/${prevCandidate}` : productImg;
                              return (
                                <React.Fragment key={idx}>
                                  <div className={`grid grid-cols-2 bg-white rounded mb-4 ${!comanda.logprolegatorie ? 'blur-sm opacity-50' : ''}`}>
                                    <div className="mb-3 col-span-2 inline-flex items-center justify-items-center px-1 py-1 pr-4 text-sm text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Component requires Flowbite JavaScript">
                                      <span aria-hidden="true" className="text-xs bg-orange-600 rounded-full text-white px-3 py-1.5 mr-3">
                                        {qty}
                                      </span>
                                      <span className="text-sm font-medium text-center">{title}</span>
                                    </div>
                                    <div className="p-8 ">
                                      <img style={{}} src={previewImg} alt="" />
                                    </div>
                                    <div>
                                      <img style={{ width: '100%' }} src={productImg} alt="" className="rounded-xl" />
                                    </div>
                                  </div>

                                  <div className="flex justify-end mb-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpandedProdPanel({ orderId: comanda.ID, productIndex: idx })}
                                    >
                                      Vezi anexe produs
                                    </Button>
                                  </div>

                                  {/* Retetar (ascuns) pentru a păstra structura din design */}
                                  <div className="retetar hidden">
                                    <div className="relative overflow-x-auto">
                                      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                          <tr>
                                            <th scope="col" className="px-6 py-3">Nume</th>
                                            <th scope="col" className="px-6 py-3">cantitate</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {/* Liniile se pot popula când vom primi datele specifice rețetarului */}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </section>
                        </main>

                      </div>
                    </div>
                  </div>

                  {/* CTA pe mobil: bară fixă jos, doar pentru primul card vizibil */}
                  {displayedComenzi[0] && displayedComenzi[0].ID === comanda.ID && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 bg-background/80 border-t border-border">
                      {comanda.logprolegatorie ? (
                        (zonaActiva !== 'productie' && zonaActiva !== 'gravare') && (
                          <Button
                            className="w-full py-4 rounded-2xl shadow font-medium bg-green-500 hover:bg-green-600"
                            onClick={() => handleMutaClick(comanda.ID)}
                            disabled={movingCommandId === comanda.ID}
                          >
                            {movingCommandId === comanda.ID ? 'Se procesează...' : 'Muta ➦'}
                          </Button>
                        )
                      ) : (
                        (zonaActiva === 'legatorie' || zonaActiva === 'dpd' || zonaActiva === 'fan') && (
                          <Button
                            className="w-full py-4 rounded-2xl shadow font-medium bg-orange-500 hover:bg-orange-600"
                            onClick={() => handleIncepeDebitareClick(comanda.ID)}
                            disabled={startingCommandId === comanda.ID}
                          >
                            {startingCommandId === comanda.ID ? 'Se procesează...' : 'Începe procesul →'}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom-fixed compact bar: search + dates (desktop and up) */}
      <div className="hidden md:block fixed bottom-0 right-0 md:left-32 z-40 bg-background border-t border-border">
        <div className="px-3 py-2 flex items-center gap-3">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchInventoryData();
                setShowInventoryModal(true);
              }}
            >
              <Database className="w-4 h-4 mr-1" />
              Stocuri
            </Button>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută nume sau ID..."
              className="h-8 px-2 py-1 border rounded-md w-full text-sm bg-background text-foreground border-input placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-1 w-max">
              {uniqueShippingDates.map((date, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedShippingData(selectedShippingData === date ? null : date)}
                  className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                    selectedShippingData === date
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:bg-accent'
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
                  <SelectItem value="debitare">Debitare</SelectItem>
                  <SelectItem value="gravare">Gravare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produse cu probleme</Label>
              <div id="product" className="border border-border rounded-md p-2 max-h-48 overflow-auto bg-background/50">
                {currentOrder?.produse_finale?.length ? (
                  currentOrder.produse_finale.map((produs, idx) => {
                    const id = String(produs.id_produs);
                    const checked = problemProducts.includes(id);
                    return (
                      <label key={idx} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setProblemProducts((prev) => {
                              const s = new Set(prev);
                              if (isChecked) s.add(id); else s.delete(id);
                              return Array.from(s);
                            });
                          }}
                        />
                        <span>{produs.nume}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground">Nu există produse</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departament</Label>
              <Select disabled>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Legatorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legatorie">Legatorie</SelectItem>
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



      {/* Inventory modal */}
      <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
        <DialogContent className="sm:max-w-5xl fixed  left-1/2 transform  rounded-t-xl rounded-b-none max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Stocuri Sistem Legatorie</DialogTitle>
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
      {/* Move (Muta) progress modal */}
      <Dialog open={showMoveModal} onOpenChange={(open) => {
        // prevent closing while running
        if (open === false && !(moveStep === 'muta-done' || moveStep === 'error')) return;
        setShowMoveModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Procesez mutarea comenzii {moveForOrderId ? `#${moveForOrderId}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
                      {(() => {
                        let val = 0;
                        switch (moveStep) {
                          case 'factura-start': val = 10; break;
                          case 'factura-done': val = 33; break;
                          case 'bon-start': val = 45; break;
                          case 'bon-done': val = 66; break;
                          case 'muta-start': val = 85; break;
                          case 'muta-done': val = 100; break;
                          default: val = 0;
                        }
                        return (
                          <div className="mb-3">
                            <div className="text-xs text-muted-foreground text-center mb-1">
                              {moveStep === 'muta-done' ? 'Gata!' : 'Se procesează…'}
                            </div>
                            <div className="max-w-xs mx-auto">
                              <Progress value={val} className="h-2" />
                            </div>
                          </div>
                        );
                      })()}
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {moveStep === 'factura-start' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : moveStep === 'factura-done' || moveStep === 'bon-start' || moveStep === 'bon-done' || moveStep === 'muta-start' || moveStep === 'muta-done' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-4 h-4"></div>
                )}
              </div>
              <div>
                {moveStep === 'factura-done' || moveStep === 'bon-start' || moveStep === 'bon-done' || moveStep === 'muta-start' || moveStep === 'muta-done' ? (
                  <div>
                    Factura generată: <span className="font-semibold">{moveInfo.serie || 'PG'} {moveInfo.numar ?? 203}</span>
                  </div>
                ) : (
                  <div>Se generează factura...</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {moveStep === 'bon-start' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : moveStep === 'bon-done' || moveStep === 'muta-start' || moveStep === 'muta-done' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-4 h-4"></div>
                )}
              </div>
              <div>
                {moveStep === 'bon-done' || moveStep === 'muta-start' || moveStep === 'muta-done' ? (
                  <div>Bon emis (<span className="font-semibold">{moveInfo.bonId || 'BON-PG-203'}</span>) și trimis la printat</div>
                ) : moveStep === 'bon-start' ? (
                  <div>Se generează bon factura...</div>
                ) : (
                  <div>Se pregătește generarea bonului...</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {moveStep === 'muta-start' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : moveStep === 'muta-done' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-4 h-4"></div>
                )}
              </div>
              <div>
                {moveStep === 'muta-done' ? (
                  <div>Comanda a fost mutată cu succes.</div>
                ) : moveStep === 'muta-start' ? (
                  <div>Se finalizează mutarea comenzii...</div>
                ) : (
                  <div>Se va trimite mutarea după generarea documentelor...</div>
                )}
              </div>
            </div>

            {moveStep === 'error' && (
              <div className="text-red-600 text-sm">Eroare: {moveInfo.error}</div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowMoveModal(false)}
              disabled={!(moveStep === 'muta-done' || moveStep === 'error')}
            >
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
