import React, { useState } from "react";
import { Book } from "../types";
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  BookOpen,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  lessonsCount: number;
  onConfirmDelete: (bookId: string) => Promise<void> | void;
}

export const DeleteBookModal: React.FC<Props> = ({
  isOpen,
  onClose,
  book,
  lessonsCount,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !book) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(book.id);
      onClose();
    } catch (err) {
      console.error("Error deleting book:", err);
      alert("حدث خطأ أثناء حذف المنهج، يرجى المحاولة ثانية.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden text-right animate-in zoom-in-95 duration-200">
        {/* Header with Alert Icon */}
        <div className="p-5 pb-4 bg-rose-50/80 border-b border-rose-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                حذف المنهج بالكامل
              </h3>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">
                إجراء لا يمكن التراجع عنه
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف هذا المنهج الدراسي بالكامل من جهازك؟
          </p>

          {/* Book Info Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>{book.subject || "منهج دراسي"}</span>
              {book.grade && <span className="text-slate-400">• {book.grade}</span>}
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
              {book.title}
            </h4>
          </div>

          {/* Warning Points */}
          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-xs text-rose-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-950">
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ما سيتم حذفه نهائياً:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 pr-1 leading-relaxed">
              <li>
                كافة الوحدات وفهرس الدروس المرتبطة (<strong>{lessonsCount} درساً</strong>).
              </li>
              <li>
                جميع خطط التدريس، بنوك الأسئلة، الملخصات، والبطاقات المولدة بالذكاء الاصطناعي.
              </li>
              <li>
                سيتم تحرير المساحة التخزينية وحذف المنهج كلياً من قاعدة البيانات المحلية.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200/70 text-xs font-bold transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ الحذف...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف المنهج بالكامل</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
