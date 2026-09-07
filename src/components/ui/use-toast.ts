import * as React from "react"
import { toast as sonnerToast } from "sonner"

type Toast = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  // Optional unique id to prevent duplicate toasts for the same error.
  id?: string | number
}

// Default toast position: top-right (appears in the middle of the screen)
const DEFAULT_TOAST_POSITION = "top-right" as const

type ToastFn = {
  (props: Toast): { id: string | number; dismiss: () => void }
  info: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  success: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  error: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  warning: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
}

// Track the most recent toast id to avoid showing duplicate toasts rapidly.
let lastToastId: string | number | null = null

function createToast({ title, description, variant, id }: Toast) {
  // If we are showing a toast with the same id, dismiss the previous one to replace it,
  // preventing duplicate toasts for the same error message.
  if (id !== undefined && lastToastId !== null) {
    sonnerToast.dismiss(lastToastId);
  }
  const fn = variant === "destructive" ? sonnerToast.error : sonnerToast
  const toastId = id !== undefined ? id : fn(title, { description, position: DEFAULT_TOAST_POSITION })
  lastToastId = toastId
  return { id: toastId, dismiss: () => sonnerToast.dismiss(toastId) }
}

const toast = Object.assign(createToast, {
  info: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) => {
    const { description } = options
    // Use a simple hash of title+description as id for deduplication.
    const id = `${title}|${description}`;
    lastToastId = id // mark as shown
    return sonnerToast.info(title, { description, position: DEFAULT_TOAST_POSITION })
  },
  success: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) => {
    const { description } = options
    const id = `${title}|${description}`;
    lastToastId = id
    return sonnerToast.success(title, { description, position: DEFAULT_TOAST_POSITION })
  },
  error: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) => {
    const { description } = options
    const id = `${title}|${description}`;
    lastToastId = id
    return sonnerToast.error(title, { description, position: DEFAULT_TOAST_POSITION })
  },
  warning: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) => {
    const { description } = options
    const id = `${title}|${description}`;
    lastToastId = id
    return sonnerToast.warning(title, { description, position: DEFAULT_TOAST_POSITION })
  },
}) as ToastFn

function useToast() {
  return { toast, dismiss: (id?: string | number) => sonnerToast.dismiss(id) }
}

export { useToast, toast }
