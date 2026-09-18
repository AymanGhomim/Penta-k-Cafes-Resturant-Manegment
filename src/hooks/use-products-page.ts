"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  categoryNames,
  productNames,
  toProductRows,
  type ProductFormDraft,
  type ProductRow,
} from "@/components/features/products/product-model";
import { usePagination } from "@/hooks/use-pagination";
import { cafeDataService } from "@/services/cafe-data.service";
import { catalogApiService } from "@/services/catalog-api.service";
import { cafeOperationsService } from "@/services/cafe-operations.service";
import { reportService } from "@/services/report.service";
import type { Category } from "@/types/category.types";

const emptyForm: ProductFormDraft = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  categoryId: "cat-1",
  price: "",
  cost: "",
  tax: "14",
};

export function useProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [availability, setAvailability] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductFormDraft>(emptyForm);

  useEffect(() => {
    const reload = async () => {
      try {
        const [remoteProducts, remoteCategories] = await Promise.all([
          catalogApiService.listProducts(),
          catalogApiService.listCategories(),
        ]);
        setProducts(toProductRows(remoteProducts));
        setCategories(remoteCategories);
      } catch {
        setProducts(toProductRows(cafeDataService.getProducts()));
        setCategories(cafeDataService.getCategories());
      }
    };
    void reload();
    const handler = () => void reload();
    window.addEventListener("tenant:changed", handler);
    return () => window.removeEventListener("tenant:changed", handler);
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (!query ||
            `${product.name} ${productNames[product.id] ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (category === "ALL" || product.categoryId === category) &&
          (availability === "ALL" ||
            (availability === "ONLINE" && product.online) ||
            (availability === "POS" && product.pos) ||
            (availability === "UNAVAILABLE" && !product.isAvailable)),
      ),
    [availability, category, products, query],
  );
  const pagination = usePagination(
    filteredProducts,
    `${query}:${category}:${availability}`,
  );

  function openForm(product?: ProductRow) {
    setEditing(product ?? null);
    setForm({
      name: product ? (productNames[product.id] ?? product.name) : "",
      description: product?.description ?? "",
      sku: product?.id ?? `SKU-${products.length + 1}`,
      barcode: "",
      categoryId: product?.categoryId ?? "cat-1",
      price: product ? String(product.price) : "",
      cost: product ? String(product.cost) : "",
      tax: "14",
    });
    setFormOpen(true);
  }

  async function saveProduct() {
    const price = Number(form.price);
    const cost = Number(form.cost);
    const tax = Number(form.tax);
    if (!form.name.trim()) return toast.error("اسم المنتج مطلوب.");
    if (!Number.isFinite(price) || price <= 0)
      return toast.error("سعر البيع يجب أن يكون أكبر من صفر.");
    if (!Number.isFinite(cost) || cost < 0)
      return toast.error("تكلفة المنتج لا يمكن أن تكون سالبة.");
    if (!Number.isFinite(tax) || tax < 0 || tax > 100)
      return toast.error("نسبة الضريبة يجب أن تكون بين 0 و100.");
    const data = {
      name: form.name.trim(),
      description: form.description,
      price,
      categoryId: form.categoryId,
      image: editing?.image,
      isAvailable: true,
    };
    try {
      const saved = editing
        ? await catalogApiService.updateProduct(editing.id, data)
        : await catalogApiService.createProduct(data);
      setProducts((current) => {
        const next = editing
          ? current.map((product) => product.id === editing.id ? { ...product, ...toProductRows([saved])[0] } : product)
          : [toProductRows([saved])[0], ...current];
        return next;
      });
    } catch {
      const localData = {
        ...data,
        id: editing?.id ?? `prod-${Date.now()}`,
        cost: Number(form.cost) || 0,
        stock: editing?.stock ?? 0,
        online: true,
        pos: true,
      };
      setProducts((current) => {
        const next = editing
          ? current.map((product) => product.id === editing.id ? { ...product, ...localData } : product)
          : [localData, ...current];
        cafeDataService.saveProducts(next);
        return next;
      });
    }
    setFormOpen(false);
    toast.success("تم حفظ المنتج");
  }

  async function duplicateProduct(product: ProductRow) {
    try {
      const saved = await catalogApiService.createProduct(product);
      setProducts((current) => [toProductRows([saved])[0], ...current]);
    } catch {
      setProducts((current) => {
        const next = [...current, { ...product, id: `${product.id}-copy` }];
        cafeDataService.saveProducts(next);
        return next;
      });
    }
  }

  async function removeProduct() {
    if (!deleteTarget) return;
    try {
      await catalogApiService.deleteProduct(deleteTarget.id);
    } catch {
      const next = products.filter((item) => item.id !== deleteTarget.id);
      cafeDataService.saveProducts(next);
    }
    const next = products.filter((item) => item.id !== deleteTarget.id);
    setProducts(next);
    cafeOperationsService.audit({
      module: "products",
      action: "PRODUCT_DELETED",
      description: `تم حذف المنتج ${deleteTarget.name}`,
      entityType: "product",
      entityId: deleteTarget.id,
    });
    setDeleteTarget(null);
    toast.success("تم حذف المنتج.");
  }

  function exportProducts() {
    try {
      const csv = reportService.toCsv(
        products.map((product) => ({
          "اسم المنتج": productNames[product.id] ?? product.name,
          القسم:
            categories.find((item) => item.id === product.categoryId)?.name ??
            categoryNames[product.categoryId] ??
            product.categoryId,
          المعرّف: product.id,
          السعر: product.price,
          التكلفة: product.cost,
          المخزون: product.stock,
          "متاح في نقطة البيع": product.pos ? "نعم" : "لا",
          "متاح أونلاين": product.online ? "نعم" : "لا",
          الحالة: product.isAvailable ? "متاح" : "غير متاح",
        })),
      );
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير المنتجات بنجاح.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تصدير المنتجات.",
      );
    }
  }

  return {
    availability,
    categories,
    category,
    deleteTarget,
    duplicateProduct,
    editing,
    exportProducts,
    filteredProducts,
    form,
    formOpen,
    openForm,
    pagination,
    products,
    query,
    removeProduct,
    saveProduct,
    setAvailability,
    setCategory,
    setDeleteTarget,
    setForm,
    setFormOpen,
    setQuery,
  };
}
