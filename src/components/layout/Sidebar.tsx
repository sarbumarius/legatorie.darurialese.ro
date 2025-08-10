import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Produs } from "@/types/dashboard";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  comenzi: Array<{
    produse_finale: Produs[];
    id_comanda?: string;
    data_comanda?: string;
  }>;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
}

interface GroupedProduct {
  id: string;
  name: string;
  image: string;
  count: number;
}

export const Sidebar = ({ comenzi, selectedProductId, setSelectedProductId }: SidebarProps) => {

  // Group products by id and count occurrences
  const groupedProducts: GroupedProduct[] = React.useMemo(() => {
    const productMap = new Map<string, GroupedProduct>();

    comenzi.forEach(comanda => {
      comanda.produse_finale.forEach(produs => {
        const id = produs.id_produs;
        const quantity = parseInt(produs.quantity) || 1;

        if (productMap.has(id)) {
          const existingProduct = productMap.get(id)!;
          existingProduct.count += quantity;
        } else {
          productMap.set(id, {
            id,
            name: produs.nume,
            image: produs.poza ? `https://darurialese.com/wp-content/uploads/${produs.poza}` : "/api/placeholder/48/48",
            count: quantity
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.count - a.count);
  }, [comenzi]);

  // Filter orders that contain the selected product
  const filteredOrders = React.useMemo(() => {
    if (!selectedProductId) return [];

    return comenzi.filter(comanda => 
      comanda.produse_finale.some(produs => produs.id_produs === selectedProductId)
    );
  }, [comenzi, selectedProductId]);

  return (
    <aside className="w-32 bg-muted/10 p-4 border-r border-border h-screen overflow-y-auto fixed left-0 top-20 bottom-0 no-scrollbar">
      {(() => {
        const totalCount = groupedProducts.reduce((sum, p) => sum + (Number(p.count) || 0), 0);
        return (
          <div className="flex justify-center mb-2">
            <div
              className="inline-flex rounded-md overflow-hidden border border-border"
              title={`${groupedProducts.length} tipuri, ${totalCount} bucăți în total`}
            >
              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-none text-xs">
                {groupedProducts.length}
              </Button>
              <div className="h-6 w-px bg-border" />
              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-none text-xs">
                {totalCount}
              </Button>
            </div>
          </div>
        );
      })()}
      {selectedProductId && (
        <div className="flex justify-center mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setSelectedProductId(null)}
            title="Resetează filtrul produs"
            aria-label="Reset filtru"
          >
            Reset filtru
          </Button>
        </div>
      )}

      {groupedProducts.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item} className="p-2 flex justify-center">
              <div className="relative">
                <Skeleton className="w-24 h-24 rounded" />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-muted rounded-full flex items-center justify-center" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {groupedProducts.map((product) => (
              <Card 
                key={product.id} 
                className={`p-2 flex justify-center ${selectedProductId === product.id ? 'bg-blue-50' : ''}`}
              >
                <div 
                  className="relative cursor-pointer" 
                  onClick={() => setSelectedProductId(selectedProductId === product.id ? null : product.id)}
                >
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded"
                    title={product.name}
                  />
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {product.count}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/*{selectedProductId && filteredOrders.length > 0 && (*/}
          {/*  <div className="mt-6">*/}
          {/*    <h3 className="text-md font-semibold mb-3">Comenzi cu acest produs ({filteredOrders.length})</h3>*/}
          {/*    <div className="space-y-2">*/}
          {/*      {filteredOrders.map((comanda) => (*/}
          {/*        <Card key={comanda.id_comanda} className="p-2 text-xs">*/}
          {/*          <p className="font-medium">Comanda: {comanda.id_comanda}</p>*/}
          {/*          {comanda.data_comanda && (*/}
          {/*            <p className="text-muted-foreground">Data: {comanda.data_comanda}</p>*/}
          {/*          )}*/}
          {/*        </Card>*/}
          {/*      ))}*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}
        </>
      )}
    </aside>
  );
};
