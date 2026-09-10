export type ToastType = "success" | "error";

export function showToast(message: string, type: ToastType = "success") {
  window.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type } })
  );
}