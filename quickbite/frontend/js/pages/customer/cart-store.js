const CART_KEY = "foodie_cart";

function readCart() {
  try {
    const rows = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function cartItemKey(item) {
  const toppings = [...(item.toppings || [])].sort();
  return [item.dish_id || "", item.name, item.size || "", toppings.join(",")].join("|");
}

function addToCart(item) {
  const cart = readCart();
  const key = cartItemKey(item);
  const found = cart.find((row) => row.key === key);
  if (found) {
    found.qty = Math.min(99, Number(found.qty) + Number(item.qty));
  } else {
    cart.push({
      key,
      dish_id: Number(item.dish_id) || null,
      name: item.name,
      size: item.size || "",
      toppings: item.toppings || [],
      unitPrice: Number(item.unitPrice) || 0,
      qty: Math.min(99, Number(item.qty) || 1),
      tone: item.tone || "peach",
    });
  }
  if (found && !found.dish_id && item.dish_id) found.dish_id = Number(item.dish_id);
  writeCart(cart);
  return cart;
}
