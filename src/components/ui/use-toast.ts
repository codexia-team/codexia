import * as React from "react"
import { toast as sonnerToast } from "sonner"

type Toast = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
}

type ToastFn = {
  (props: Toast): { id: string | number; dismiss: () => void }
  info: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  success: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  error: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
  warning: (title: React.ReactNode, options?: Omit<Toast, "title">) => string | number
}

function createToast({ title, description, variant }: Toast) {
  const fn = variant === "destructive" ? sonnerToast.error : sonnerToast
  const id = fn(title, { description })
  return { id, dismiss: () => sonnerToast.dismiss(id) }
}

const toast = Object.assign(createToast, {
  info: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    sonnerToast.info(title, { description: options.description }),
  success: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    sonnerToast.success(title, { description: options.description }),
  error: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    sonnerToast.error(title, { description: options.description }),
  warning: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    sonnerToast.warning(title, { description: options.description }),
}) as ToastFn

function useToast() {
  return { toast, dismiss: (id?: string | number) => sonnerToast.dismiss(id) }
}

export { useToast, toast }
