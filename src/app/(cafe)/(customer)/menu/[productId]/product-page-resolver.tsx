"use client";

import { useEffect, useState } from "react";
import { AppLoadingState, AppNotFoundState } from "@/components/feedback/app-state";
import { publicMenuApiService } from "@/services/public-menu-api.service";
import type { Product } from "@/types/product.types";
import { ProductDetailClient } from "./product-detail-client";
import { useCustomerRoute } from "@/providers/customer-route-provider";

export function ProductPageResolver({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null | undefined>();
  const customerRoute = useCustomerRoute();
  const tenantId = customerRoute.context?.tenant.id;
  const branchId = customerRoute.context?.branch.id;

  useEffect(() => {
    const resolve = () => {
      if (!tenantId || !branchId) return setProduct(null);
      void publicMenuApiService.load(tenantId, branchId).then((data) => setProduct(data.products.find((item) => item.id === productId && item.isAvailable) ?? null)).catch(() => setProduct(null));
    };
    resolve();
    window.addEventListener("branch:changed", resolve);
    window.addEventListener("tenant:changed", resolve);
    return () => {
      window.removeEventListener("branch:changed", resolve);
      window.removeEventListener("tenant:changed", resolve);
    };
  }, [branchId, productId, tenantId]);

  if (product === undefined)
    return <AppLoadingState variant="cafe" title="جاري تحميل المنتج..." />;
  if (!product)
    return (
      <AppNotFoundState
        variant="cafe"
        description="المنتج غير متاح في منيو الفرع الحالي."
        actionHref="/menu"
        actionLabel="العودة إلى المنيو"
      />
    );
  return <ProductDetailClient product={product} />;
}
