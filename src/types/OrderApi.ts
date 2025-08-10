// src/types/OrderApi.ts
export interface OrderApiResponse {
    // new optional gift product in order
    produs_cadou_nou?: {
        personalizare_cadou_comanda?: string;
        fisier_productie_cadou?: string;
        produs_cadou_nou?: string;
    };
    ID: number;
    shipping_details: {
        _shipping_first_name: string;
        _shipping_last_name: string;
    };
    ramburs: string;
    metodatransportcustom: string;
    post_status: string;
    expediere: string;
    post_date: string;
    total_buc: number;
    pret_total: string;
    order_total_formatted: string;
    logdebitare: string;
    logprodebitare: string;
    loggravare: string;
    fisieregrafica: any[];
    download_fisiere_grafica: any[];
    previzualizare_galerie: (string | null)[];
    anexe_diferite_comanda: { anexe_diferite_comanda: string };
    atentie_pix?: number | string | boolean;
    atentie_licheni?: { licheni_diferiti?: string | number | boolean } | string | number | boolean | null;
    refacut: number;
    motiv_refacut: string;
    gravare: boolean;
    printare: boolean;
    bon_zebra: boolean;
    bon_old: boolean;
    produse_finale: Array<{
        id_produs: string;
        nume: string;
        item: number;
        poza: string;
        quantity: string;
        dificultate: number;
        alpha: number;
        anexe: Record<string, string>;
        anexe_alpha: Record<string, string>;
    }>;
    lipsuri: string[];
    nr: number;
}
