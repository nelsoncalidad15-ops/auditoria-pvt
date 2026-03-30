import { AnimatePresence, motion } from "motion/react";
import { Button } from "./Button";

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function AppModal({ isOpen, onClose, onConfirm, title, message }: AppModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="panel-premium relative w-full max-w-md space-y-6 rounded-[2rem] p-8"
          >
            <div className="space-y-2 text-center">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Confirmación</span>
              <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500">{message}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                Confirmar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}