"use client";

import { useEffect, useState } from "react";
import { AppLoadingState, AppNotFoundState } from "@/components/feedback/app-state";
import { publicMenuApiService } from "@/services/public-menu-api.service";
import { useCustomerRoute } from "@/providers/customer-route-provider";
import type { Offer } from "@/types/offer.types";
import { OfferDetailClient } from "./offer-detail-client";
import { useTenant } from "@/providers/tenant-provider";

export function OfferPageResolver({ offerId }: { offerId: string }) {
  const { tenant } = useTenant();
  const customerRoute = useCustomerRoute();
  const [offer, setOffer] = useState<Offer | null | undefined>();

  useEffect(() => {
    const resolve = () => { const branchId = customerRoute.context?.branch.id; if (!branchId) return setOffer(null); void publicMenuApiService.load(tenant.id, branchId).then((data) => setOffer(data.offers.find((item) => item.id === offerId && item.isActive) ?? null)).catch(() => setOffer(null)); };
    window.addEventListener("tenant:changed", resolve);
    return () => window.removeEventListener("tenant:changed", resolve);
  }, [customerRoute.context?.branch.id, offerId, tenant.id]);

  if (offer === undefined)
    return <AppLoadingState variant="cafe" title="جاري تحميل العرض..." />;
  if (!offer)
    return (
      <AppNotFoundState
        variant="cafe"
        description="العرض غير متاح لهذا الكافيه."
        actionHref="/menu"
        actionLabel="العودة إلى المنيو"
      />
    );
  return <OfferDetailClient offer={offer} />;
}
