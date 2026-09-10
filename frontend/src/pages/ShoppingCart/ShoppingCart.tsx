import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCart,
  removeFromCart,
  checkout,
  type ShoppingCart as ShoppingCartData,
  type TourPurchaseToken,
  formatPrice,
} from "../../services/api";

import "./ShoppingCart.css";

export default function ShoppingCart() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [cart, setCart] = useState<ShoppingCartData | null>(null);
  const [tokens, setTokens] = useState<TourPurchaseToken[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    load();
   }, [token, navigate]);

  async function load() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const result = await getCart(token);
      setCart(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your cart.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(tourId: string) {
    if (!token) return;

    setError("");
    setRemovingId(tourId);

    try {
      const result = await removeFromCart(token, tourId);
      setCart(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCheckout() {
    if (!token) return;

    setError("");
    setCheckingOut(true);

    try {
      const result = await checkout(token);
      setTokens(result.tokens);
      setCart((current) =>
        current ? { ...current, items: [], totalPrice: 0 } : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="shopping-cart-page">
        <div className="shopping-cart-container">
          <div className="shopping-cart-status">Loading your cart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-cart-page">
      <div className="shopping-cart-container">
        {/* <button className="shopping-cart-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="shopping-cart-header">
          
          <h1>Your cart</h1>
          <p>Review the tours you've picked out before checking out.</p>
        </div>

        {error && <div className="shopping-cart-message shopping-cart-error">{error}</div>}

        {tokens && (
          <div className="shopping-cart-receipt">
            <h2>✓ Purchase complete</h2>
            <p>You now have access to the following tours:</p>

            <div className="shopping-cart-receipt-list">
              {tokens.map((t) => (
                <div className="shopping-cart-receipt-item" key={t.id}>
                  <div>
                    <strong>{t.tourName}</strong>
                    <span>{formatPrice(t.price)}</span>
                  </div>
                  <code>{t.token}</code>
                </div>
              ))}
            </div>

            <button
              className="shopping-cart-continue"
              onClick={() => navigate("/")}
            >
              Continue exploring
            </button>
          </div>
        )}

        {!tokens && cart && cart.items.length === 0 && (
          <div className="shopping-cart-empty">
            <h2>Your cart is empty</h2>
            <p>Browse tours and add the ones you'd like to purchase.</p>
          </div>
        )}

        {!tokens && cart && cart.items.length > 0 && (
          <>
            <div className="shopping-cart-list">
              {cart.items.map((item) => (
                <div className="shopping-cart-item" key={item.id}>
                  <div className="shopping-cart-item-info">
                    <h3>{item.tourName}</h3>
                    {formatPrice(item.price)}
                  </div>

                  <button
                    className="shopping-cart-remove"
                    onClick={() => handleRemove(item.tourId)}
                    disabled={removingId === item.tourId}
                  >
                    {removingId === item.tourId ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>

            <div className="shopping-cart-summary">
              <div className="shopping-cart-total">
                <span>Total</span>
                <strong>{formatPrice(cart.totalPrice)}</strong>
              </div>

              <button
                className="shopping-cart-checkout"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? "Processing..." : "Checkout"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}