"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { done, fail } from "@/lib/flash";

const CartItem = z.object({
  product_id: z.string().uuid("Invalid product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(99),
});

/** Get (or create) the current user's cart with items and product details. */
export async function getCart() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { cart: null, items: [] as any[] };

  let cart: any = await sb
    .from("carts")
    .select("id, user_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle()
    .then((r: any) => r.data);

  if (!cart) {
    const created = await sb.from("carts").insert({ user_id: user.id }).select().single();
    cart = created.data;
  }

  const { data: items } = await sb
    .from("cart_items")
    .select(`
      id, quantity, created_at,
      product:products(id, name, product_code, price, quantity, stock_status, image_url, category_id)
    `)
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  return { cart, items: items ?? [] };
}

/** Add a product to the cart (validates stock). */
export async function addToCart(fd: FormData) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail("/login?next=/cart", "Please log in to add items to your cart.");

  const p = CartItem.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail("/products", p.error.issues[0].message);

  const { product_id, quantity } = p.data;

  // Ensure cart exists
  let cart: any = await sb.from("carts").select("id").eq("user_id", user.id).maybeSingle().then((r: any) => r.data);
  if (!cart) {
    const created = await sb.from("carts").insert({ user_id: user.id }).select().single();
    cart = created.data;
  }

  // Check stock
  const { data: product } = await sb
    .from("products")
    .select("id, name, quantity, stock_status")
    .eq("id", product_id)
    .single() as any;
  if (!product || product.stock_status === "out_of_stock") {
    return fail("/products", "This product is out of stock.");
  }

  // Existing item quantity + new quantity must not exceed stock
  const { data: existing } = await sb
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", product_id)
    .maybeSingle() as any;
  const totalQty = (existing?.quantity ?? 0) + quantity;
  if (totalQty > product.quantity) {
    return fail("/products", `Only ${product.quantity} of "${product.name}" are in stock.`);
  }

  if (existing) {
    await sb.from("cart_items").update({ quantity: totalQty }).eq("id", existing.id);
  } else {
    await sb.from("cart_items").insert({ cart_id: cart.id, product_id, quantity });
  }

  revalidatePath("/cart");
  return done("/cart", `${product.name} added to your cart.`);
}

/** Update the quantity of a cart item. */
export async function updateCartItem(fd: FormData) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return redirect("/login");

  const itemId = String(fd.get("item_id"));
  const quantity = Number(fd.get("quantity"));
  if (!itemId || !quantity || quantity < 1 || quantity > 99) {
    return fail("/cart", "Invalid quantity.");
  }

  // Verify ownership
  const { data: item } = await sb
    .from("cart_items")
    .select(`
      id, quantity,
      cart:carts(user_id),
      product:products(id, name, quantity, stock_status)
    `)
    .eq("id", itemId)
    .single() as any;
  if (!item || item.cart.user_id !== user.id) {
    return fail("/cart", "Cart item not found.");
  }
  if (item.product.stock_status === "out_of_stock") {
    return fail("/cart", `"${item.product.name}" is out of stock.`);
  }
  if (quantity > item.product.quantity) {
    return fail("/cart", `Only ${item.product.quantity} of "${item.product.name}" are in stock.`);
  }

  await sb.from("cart_items").update({ quantity }).eq("id", itemId);
  revalidatePath("/cart");
  return done("/cart", "Cart updated.");
}

/** Remove a cart item. */
export async function removeFromCart(fd: FormData) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return redirect("/login");

  const itemId = String(fd.get("item_id"));
  const { data: item } = await sb
    .from("cart_items")
    .select("id, cart:carts(user_id)")
    .eq("id", itemId)
    .single() as any;
  if (!item || item.cart.user_id !== user.id) {
    return fail("/cart", "Cart item not found.");
  }

  await sb.from("cart_items").delete().eq("id", itemId);
  revalidatePath("/cart");
  return done("/cart", "Item removed from your cart.");
}

/** Clear the entire cart. */
export async function clearCart() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return redirect("/login");

  const { data: cart } = await sb.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (cart) await sb.from("cart_items").delete().eq("cart_id", cart.id);
  revalidatePath("/cart");
  return done("/cart", "Cart cleared.");
}
