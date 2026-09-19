"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";

import { MenuCategoryButton } from "@/components/features/customer-menu/menu-category-button";
import { MenuProductCard } from "@/components/features/customer-menu/menu-product-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/shared/price";
import { SiteHeader } from "@/components/shared/site-header";
import { cn } from "@/lib/utils";
import {
  menuCopy,
  translatedCategoryName,
  translatedProduct,
  type Locale,
} from "@/lib/menu-translations";
import { publicMenuApiService } from "@/services/public-menu-api.service";
import type { Product } from "@/types/product.types";
import type { Category } from "@/types/category.types";
import type { Offer } from "@/types/offer.types";
import { useCartStore } from "@/store/cart.store";
import { useCustomerRoute } from "@/providers/customer-route-provider";

const allCategoryId = "all";

export function MenuPageClient() {
  const [selectedCategory, setSelectedCategory] = useState(allCategoryId);
  const [searchQuery, setSearchQuery] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const [branchProducts, setBranchProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    Category[]
  >([]);
  const [activeOffers, setActiveOffers] = useState<
    Offer[]
  >([]);
  const dragStartX = useRef(0);
  const didDrag = useRef(false);
  const router = useRouter();
  const customerRoute = useCustomerRoute();
  const customerTenantId = customerRoute.context?.tenant.id;
  const customerBranchId = customerRoute.context?.branch.id;
  const addItem = useCartStore((state) => state.addItem);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const refresh = () => {
      if (!customerTenantId || !customerBranchId) return;
      void publicMenuApiService.load(customerTenantId, customerBranchId).then((data) => { setBranchProducts(data.products); setCategories(data.categories.filter((category) => category.isActive).sort((a, b) => a.sortOrder - b.sortOrder)); setActiveOffers(data.offers.filter((offer) => offer.isActive).sort((a, b) => a.sortOrder - b.sortOrder)); }).catch(() => { setBranchProducts([]); setCategories([]); setActiveOffers([]); });
    };
    void Promise.resolve().then(() => {
      setIsHydrated(true);
      refresh();
    });
    window.addEventListener("branch:changed", refresh);
    window.addEventListener("tenant:changed", refresh);
    return () => {
      window.removeEventListener("branch:changed", refresh);
      window.removeEventListener("tenant:changed", refresh);
    };
  }, [customerBranchId, customerTenantId]);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("cafe-ui-locale");
    if (savedLocale === "ar") setLocale("ar");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("cafe-ui-locale", locale);
  }, [locale]);

  useEffect(() => {
    if (activeOffers.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveOfferIndex((index) => {
        if (locale === "ar") {
          return index === 0 ? activeOffers.length - 1 : index - 1;
        }

        return (index + 1) % activeOffers.length;
      });
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [activeOffers.length, locale]);

  const products = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return branchProducts.filter((product) => {
      const productText = translatedProduct(product.id, locale);
      const categoryName = translatedCategoryName(product.categoryId, locale);
      const searchableText =
        `${productText.name} ${productText.description} ${categoryName}`.toLowerCase();

      return (
        product.isAvailable &&
        (selectedCategory === allCategoryId ||
          product.categoryId === selectedCategory) &&
        (!normalizedSearchQuery ||
          searchableText.includes(normalizedSearchQuery))
      );
    });
  }, [branchProducts, locale, searchQuery, selectedCategory]);

  const quantitiesByProduct = useMemo(() => {
    if (!isHydrated) return new Map<string, number>();
    return new Map(items.map((item) => [item.productId, item.quantity]));
  }, [isHydrated, items]);

  const copy = menuCopy[locale];
  const featuredOffer = activeOffers[activeOfferIndex];

  function markImageLoaded(imageId: string) {
    setLoadedImages((current) => {
      if (current.has(imageId)) return current;
      const next = new Set(current);
      next.add(imageId);
      return next;
    });
  }

  function finishOfferDrag() {
    if (!isDragging) return;

    const threshold = 60;
    const directionalOffset = locale === "ar" ? -dragOffset : dragOffset;

    if (directionalOffset > threshold) {
      setActiveOfferIndex((index) =>
        index === 0 ? activeOffers.length - 1 : index - 1,
      );
    } else if (directionalOffset < -threshold) {
      setActiveOfferIndex((index) => (index + 1) % activeOffers.length);
    }

    setIsDragging(false);
    setDragOffset(0);
  }

  return (
    <main
      className="min-h-screen bg-background pb-28"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <SiteHeader locale={locale} onLocaleChange={setLocale} />

      <section className="animate-content-enter mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {featuredOffer ? (
          <div
            className="relative mb-6 touch-pan-y overflow-hidden rounded-md"
            dir="ltr"
            onPointerDown={(event) => {
              if (activeOffers.length <= 1) return;
              dragStartX.current = event.clientX;
              didDrag.current = false;
              setIsDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!isDragging) return;
              const nextOffset = event.clientX - dragStartX.current;
              if (Math.abs(nextOffset) > 24) didDrag.current = true;
              setDragOffset(Math.max(-120, Math.min(120, nextOffset)));
            }}
            onPointerUp={finishOfferDrag}
            onPointerCancel={finishOfferDrag}
          >
            <div
              className={cn(
                "flex ease-out",
                isDragging
                  ? "transition-none"
                  : "transition-transform duration-200",
              )}
              style={{
                transform: `translateX(calc(-${activeOfferIndex * 100}% + ${dragOffset}px))`,
              }}
            >
              {activeOffers.map((offer, index) => (
                <button
                  key={offer.id}
                  type="button"
                  className="group relative block min-h-[17rem] w-full shrink-0 overflow-hidden rounded-md border bg-muted text-start shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] transition-all duration-200 ease-out hover:scale-[1.005] hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_16px_36px_hsl(var(--foreground)/0.1)] active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-64 sm:min-h-0"
                  onClick={() => {
                    if (didDrag.current) return;
                    router.push(customerRoute.href(`/offers/${offer.id}`));
                  }}
                >
                  {!loadedImages.has(`offer-${offer.id}`) ? (
                    <Skeleton className="absolute inset-0 z-0 rounded-none bg-white/10" />
                  ) : null}
                  <Image
                    src={offer.image || "/cafe-placeholder.svg"}
                    alt={offer.title}
                    fill
                    sizes="(min-width: 1024px) 1152px, 100vw"
                    className={cn(
                      "object-cover transition-[opacity,transform] duration-200 ease-out group-hover:scale-[1.025]",
                      loadedImages.has(`offer-${offer.id}`)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                    onLoad={() => markImageLoaded(`offer-${offer.id}`)}
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 via-55% to-black/5" />
                  <div
                    className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-8"
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  >
                    <div className="max-w-[44rem] space-y-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 sm:space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="w-fit border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/20">
                          {locale === "ar" ? "عرض خاص" : "Special offer"}
                        </Badge>
                      </div>
                      <div className="space-y-2 sm:space-y-4">
                        <h2 className="line-clamp-2 text-3xl font-black leading-[1.05] tracking-normal drop-shadow-sm sm:text-5xl">
                          {offer.title}
                        </h2>
                        <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-white/85 drop-shadow-sm sm:text-base sm:leading-7">
                          {offer.description}
                        </p>
                        <div className="flex flex-wrap items-end gap-4 pt-2">
                          <Price
                            value={offer.price}
                            locale={locale}
                            className="text-4xl font-black leading-none text-white drop-shadow-sm sm:text-6xl"
                            currencyClassName="text-base font-bold text-white/85 sm:text-xl"
                          />
                          <Price
                            value={offer.originalPrice}
                            locale={locale}
                            className="pb-1 text-sm font-bold text-white/50 line-through sm:text-lg"
                            currencyClassName="text-xs text-white/45 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {activeOffers.length > 1 ? (
              <div
                className={cn(
                  "absolute bottom-4 flex gap-2",
                  locale === "ar" ? "left-4" : "right-4",
                )}
                dir="ltr"
              >
                {activeOffers.map((offer, index) => (
                  <button
                    key={offer.id}
                    type="button"
                    className={cn(
                      "h-2 rounded-full bg-white/50 transition-all duration-200 ease-out",
                      index === activeOfferIndex ? "w-6 bg-white" : "w-2",
                    )}
                    onClick={() => setActiveOfferIndex(index)}
                    aria-label={`Show offer ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative mb-4">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
              locale === "ar" ? "right-4" : "left-4",
            )}
          />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={locale === "ar" ? "ابحث عن منتج" : "Search products"}
            className={cn(
              "h-12 rounded-full border-border/70 bg-card/80 text-base font-semibold shadow-[0_8px_18px_hsl(var(--foreground)/0.06)] backdrop-blur-sm transition-all focus-visible:ring-accent/40 sm:text-sm",
              locale === "ar" ? "pr-11 text-right" : "pl-11",
            )}
          />
        </div>

        <div className="relative mb-6">
          <div className="scrollbar-hidden flex gap-4 overflow-x-auto pb-2 pr-10">
            <MenuCategoryButton
              isSelected={selectedCategory === allCategoryId}
              onClick={() => setSelectedCategory(allCategoryId)}
            >
              {copy.all}
            </MenuCategoryButton>
            {categories.map((category) => (
              <MenuCategoryButton
                key={category.id}
                isSelected={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
              >
                {translatedCategoryName(category.id, locale)}
              </MenuCategoryButton>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {products.map((product, index) => (
            <MenuProductCard
              key={product.id}
              product={product}
              index={index}
              locale={locale}
              quantity={quantitiesByProduct.get(product.id) ?? 0}
              imageLoaded={loadedImages.has(`product-${product.id}`)}
              addLabel={copy.add}
              onOpen={() =>
                router.push(customerRoute.href(`/menu/${product.id}`))
              }
              onImageLoaded={() => markImageLoaded(`product-${product.id}`)}
              onDecrease={() => decreaseQuantity(product.id)}
              onIncrease={() => increaseQuantity(product.id)}
              onAdd={() => {
                const translated = translatedProduct(product.id, locale);
                addItem({
                  productId: product.id,
                  name: translated.name,
                  price: product.price,
                  image: product.image,
                  quantity: 1,
                });
              }}
            />
          ))}
        </div>
        {isHydrated && branchProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-black">
              {locale === "ar"
                ? "لا توجد منتجات متاحة"
                : "No products available"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === "ar"
                ? "لم تتم إضافة منتجات متاحة إلى منيو هذا الفرع حتى الآن."
                : "No available products have been added to this branch menu yet."}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
