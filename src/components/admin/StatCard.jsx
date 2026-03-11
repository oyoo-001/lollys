import React from "react";

export default function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-stone-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}