"use client"

import { motion } from "framer-motion"
import { useDietaryStore } from "@/store/useDietaryStore"
import { Utensils, CheckCircle2, Clock, AlertTriangle, BookOpen } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/PageHeader"

export default function DietaryDashboard() {
  const { dietPlans, getTodayOrders } = useDietaryStore()
  const todayOrders = getTodayOrders()
  const delivered   = todayOrders.filter((o) => o.status === 'delivered').length
  const scheduled   = todayOrders.filter((o) => o.status === 'scheduled').length

  return (
    <div className="space-y-6 pt-6">
      <PageHeader
        title="Dietary Dashboard"
        subtitle="Diet plans, meal orders, and nutrition management"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Diet Plans" value={dietPlans.length}    icon={BookOpen}     color="blue"  delay={0} />
        <StatCard label="Delivered Today"   value={delivered}           icon={CheckCircle2} color="green" delay={0.05} />
        <StatCard label="Scheduled"         value={scheduled}           icon={Clock}        color="amber" delay={0.1} />
        <StatCard label="Total Today"       value={todayOrders.length}  icon={Utensils}     color="slate" delay={0.15} />
      </div>

      {/* Active Diet Plans */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Utensils className="h-4 w-4 text-green-600" /> Active Diet Plans
        </h3>
        <div className="space-y-2">
          {dietPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-slate-800 text-sm">{plan.patientName}</p>
                  {plan.aiGenerated && <Badge variant="primary" size="sm">AI</Badge>}
                </div>
                <p className="text-xs text-slate-500">{plan.ward} · {plan.bedNumber} · {plan.dietType}</p>
                {plan.allergyFlags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">Allergies: {plan.allergyFlags.join(', ')}</p>
                  </div>
                )}
              </div>
              {plan.calorieTarget && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-700">{plan.calorieTarget}</p>
                  <p className="text-[10px] text-slate-400">kcal target</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Today's Meal Orders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" /> Today&apos;s Meal Orders
        </h3>
        <div className="space-y-2">
          {todayOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors"
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">{order.patientName} — {order.mealType}</p>
                <p className="text-xs text-slate-500">{order.ward} · {order.bedNumber} · {order.items.join(', ')}</p>
              </div>
              <Badge
                variant={order.status === 'delivered' ? 'success' : 'warning'}
                icon={order.status === 'delivered' ? CheckCircle2 : Clock}
              >
                {order.status.toUpperCase()}
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
