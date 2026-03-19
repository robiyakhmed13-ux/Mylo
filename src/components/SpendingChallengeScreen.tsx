import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trophy, Flame, Target, Check, X, Sparkles, Gift, Wallet, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/context/AppContext";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isBefore } from "date-fns";
import { useHaptic } from "@/hooks/useHaptic";
import { useCurrency } from "@/hooks/useCurrency";

interface Challenge {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDays: number;
  completedDays: string[];
  failedDays: string[];
  category?: string;
  isActive: boolean;
  dailyAmount: number; // typical daily spend for this category
}

const TRANSLATIONS = {
  title: { en: "Spending Challenges", ru: "Челленджи расходов", uz: "Xarajat chellenjlari" },
  subtitle: { en: "Set no-spend goals and see your savings", ru: "Установите цели без трат и увидите экономию", uz: "Xarajatsiz maqsadlarni belgilang" },
  newChallenge: { en: "New Challenge", ru: "Новый челлендж", uz: "Yangi chellenj" },
  activeChallenges: { en: "Active Challenges", ru: "Активные челленджи", uz: "Faol chellenjlar" },
  completedChallenges: { en: "Completed", ru: "Завершённые", uz: "Yakunlangan" },
  noSpendWeek: { en: "No-Spend Week", ru: "Неделя без трат", uz: "Xarajatsiz hafta" },
  noSpendWeekend: { en: "No-Spend Weekend", ru: "Выходные без трат", uz: "Xarajatsiz dam olish kunlari" },
  noEatingOut: { en: "No Eating Out", ru: "Без кафе/ресторанов", uz: "Tashqarida ovqatlanmaslik" },
  noOnlineShopping: { en: "No Online Shopping", ru: "Без онлайн покупок", uz: "Onlayn xarid qilmaslik" },
  custom: { en: "Custom Challenge", ru: "Свой челлендж", uz: "Maxsus chellenj" },
  currentStreak: { en: "Current Streak", ru: "Текущая серия", uz: "Joriy ketma-ketlik" },
  daysCompleted: { en: "Days Completed", ru: "Дней выполнено", uz: "Tugatilgan kunlar" },
  markToday: { en: "How was today?", ru: "Как прошёл день?", uz: "Bugun qanday o'tdi?" },
  noSpend: { en: "No Spend! 🎉", ru: "Без трат! 🎉", uz: "Xarajat yo'q! 🎉" },
  didSpend: { en: "I Spent 😔", ru: "Потратил 😔", uz: "Sarfladim 😔" },
  keepGoing: { en: "Keep going!", ru: "Продолжайте!", uz: "Davom eting!" },
  startChallenge: { en: "Start Challenge", ru: "Начать челлендж", uz: "Chellenjni boshlash" },
  days: { en: "days", ru: "дней", uz: "kun" },
  selectType: { en: "Select challenge type:", ru: "Выберите тип челленджа:", uz: "Chellenj turini tanlang:" },
  cancel: { en: "Cancel", ru: "Отмена", uz: "Bekor qilish" },
  noChallenges: { en: "No challenges yet", ru: "Пока нет челленджей", uz: "Hali chellenjlar yo'q" },
  startFirst: { en: "Start your first challenge!", ru: "Начните свой первый челлендж!", uz: "Birinchi chellenjingizni boshlang!" },
  savedSoFar: { en: "Saved so far", ru: "Сэкономлено", uz: "Tejaldi" },
  potentialSavings: { en: "Potential savings", ru: "Потенциальная экономия", uz: "Mumkin bo'lgan tejash" },
  dailyAmount: { en: "Daily usual spend", ru: "Обычная трата в день", uz: "Kunlik odatiy xarajat" },
  dailyAmountHint: { en: "e.g. 50,000 for lunch", ru: "напр. 50 000 на обед", uz: "masalan, tushlik uchun 50 000" },
  youCouldSave: { en: "You could save", ru: "Вы можете сэкономить", uz: "Siz tejashingiz mumkin" },
  youSaved: { en: "You saved", ru: "Вы сэкономили", uz: "Siz tejadingiz" },
  ofGoal: { en: "of goal", ru: "от цели", uz: "maqsaddan" },
  totalSaved: { en: "Total Saved", ru: "Всего сэкономлено", uz: "Jami tejalgan" },
  totalPotential: { en: "Total Potential", ru: "Всего потенциально", uz: "Jami mumkin" },
};

const CHALLENGE_PRESETS = [
  { id: "no-spend-week", icon: "🚫", days: 7, defaultAmount: 50000 },
  { id: "no-spend-weekend", icon: "🏖️", days: 2, defaultAmount: 100000 },
  { id: "no-eating-out", icon: "🍳", days: 7, defaultAmount: 50000 },
  { id: "no-online-shopping", icon: "🛒", days: 7, defaultAmount: 30000 },
  { id: "custom", icon: "✨", days: 7, defaultAmount: 50000 },
];

export const SpendingChallengeScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { lang } = useApp();
  const { triggerLight, triggerSuccess, triggerError } = useHaptic();
  const { formatWithCurrency, baseCurrency } = useCurrency();
  const formatAmount = (amount: number) => formatWithCurrency(amount, baseCurrency);
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem("spending_challenges");
    if (!saved) return [];
    // Migrate old challenges without dailyAmount
    const parsed = JSON.parse(saved);
    return parsed.map((c: any) => ({ ...c, dailyAmount: c.dailyAmount || 50000 }));
  });
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [dailyAmount, setDailyAmount] = useState<string>("50000");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeChallenges = challenges.filter((c) => c.isActive);
  const pastChallenges = challenges.filter((c) => !c.isActive);

  useEffect(() => {
    localStorage.setItem("spending_challenges", JSON.stringify(challenges));
  }, [challenges]);

  const getPresetName = (presetId: string) => {
    switch (presetId) {
      case "no-spend-week": return TRANSLATIONS.noSpendWeek[lang];
      case "no-spend-weekend": return TRANSLATIONS.noSpendWeekend[lang];
      case "no-eating-out": return TRANSLATIONS.noEatingOut[lang];
      case "no-online-shopping": return TRANSLATIONS.noOnlineShopping[lang];
      case "custom": return customName || TRANSLATIONS.custom[lang];
      default: return presetId;
    }
  };

  const startChallenge = () => {
    if (!selectedPreset) return;
    triggerSuccess();

    const preset = CHALLENGE_PRESETS.find((p) => p.id === selectedPreset);
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const newChallenge: Challenge = {
      id: Date.now().toString(),
      name: getPresetName(selectedPreset),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      targetDays: preset?.days || 7,
      completedDays: [],
      failedDays: [],
      isActive: true,
      dailyAmount: parseInt(dailyAmount) || 50000,
    };

    // Keep all existing challenges, just add the new one
    setChallenges((prev) => [...prev, newChallenge]);
    setShowNewChallenge(false);
    setSelectedPreset(null);
    setCustomName("");
    setDailyAmount("50000");
  };

  const markDay = (challengeId: string, success: boolean) => {
    if (success) triggerSuccess(); else triggerError();
    const today = format(new Date(), "yyyy-MM-dd");
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id !== challengeId) return c;
        if (success) {
          return { ...c, completedDays: [...c.completedDays, today], failedDays: c.failedDays.filter(d => d !== today) };
        } else {
          return { ...c, failedDays: [...c.failedDays, today], completedDays: c.completedDays.filter(d => d !== today) };
        }
      })
    );
  };

  const calculateStreak = (challenge: Challenge) => {
    let streak = 0;
    for (let i = 0; i < challenge.completedDays.length + 30; i++) {
      const expected = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      if (challenge.completedDays.includes(expected)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const isDayMarked = (challenge: Challenge) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return challenge.completedDays.includes(today) || challenge.failedDays.includes(today);
  };

  const isDaySuccess = (challenge: Challenge) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return challenge.completedDays.includes(today);
  };

  const getWeekDays = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getSavedAmount = (challenge: Challenge) => challenge.completedDays.length * challenge.dailyAmount;
  const getPotentialAmount = (challenge: Challenge) => challenge.targetDays * challenge.dailyAmount;

  const totalSaved = activeChallenges.reduce((sum, c) => sum + getSavedAmount(c), 0);
  const totalPotential = activeChallenges.reduce((sum, c) => sum + getPotentialAmount(c), 0);

  const getStageLabel = (challenge: Challenge) => {
    const pct = challenge.targetDays > 0 ? (challenge.completedDays.length / challenge.targetDays) * 100 : 0;
    if (pct >= 100) return { label: lang === "en" ? "Completed! 🏆" : lang === "ru" ? "Завершён! 🏆" : "Tugallandi! 🏆", color: "text-green-500" };
    if (pct >= 70) return { label: lang === "en" ? "Almost there! 🔥" : lang === "ru" ? "Почти готово! 🔥" : "Deyarli tayyor! 🔥", color: "text-amber-500" };
    if (pct >= 30) return { label: lang === "en" ? "Halfway! 💪" : lang === "ru" ? "На полпути! 💪" : "Yarim yo'lda! 💪", color: "text-primary" };
    return { label: lang === "en" ? "Just started 🌱" : lang === "ru" ? "Только начали 🌱" : "Endigina boshlandi 🌱", color: "text-muted-foreground" };
  };

  // Render a challenge card (used for both active list and expanded view)
  const renderChallengeCard = (challenge: Challenge) => {
    const streak = calculateStreak(challenge);
    const saved = getSavedAmount(challenge);
    const potential = getPotentialAmount(challenge);
    const progress = challenge.targetDays > 0 ? (challenge.completedDays.length / challenge.targetDays) * 100 : 0;
    const stage = getStageLabel(challenge);
    const isExpanded = expandedId === challenge.id;
    const markedToday = isDayMarked(challenge);

    return (
      <Card key={challenge.id} className="overflow-hidden border-border">
        {/* Compact header - always visible */}
        <button
          onClick={() => { triggerLight(); setExpandedId(isExpanded ? null : challenge.id); }}
          className="w-full p-3 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground truncate">{challenge.name}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">{streak}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${stage.color}`}>{stage.label}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-green-600 font-medium">
                {formatAmount(saved)} {TRANSLATIONS.youSaved[lang].toLowerCase()}
              </span>
            </div>
            <Progress value={progress} className="h-1.5 mt-1.5" />
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                {/* Week calendar */}
                <div className="flex justify-between">
                  {getWeekDays().map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isCompleted = challenge.completedDays.includes(dateStr);
                    const isFailed = challenge.failedDays.includes(dateStr);
                    const isTodayDate = isToday(day);
                    const isPast = isBefore(day, new Date()) && !isTodayDate;

                    return (
                      <div key={dateStr} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{format(day, "EEE").slice(0, 2)}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ${
                          isCompleted ? "bg-green-500 text-white"
                            : isFailed ? "bg-red-500 text-white"
                            : isTodayDate ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                            : isPast ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                        }`}>
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : isFailed ? <X className="w-3.5 h-3.5" /> : format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Savings info */}
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {formatAmount(challenge.dailyAmount)}/{lang === "en" ? "day" : lang === "ru" ? "день" : "kun"} × {challenge.targetDays} {TRANSLATIONS.days[lang]}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">{TRANSLATIONS.youSaved[lang]}</p>
                      <p className="text-lg font-bold text-green-600">{formatAmount(saved)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">{TRANSLATIONS.potentialSavings[lang]}</p>
                      <p className="text-sm font-semibold text-muted-foreground">{formatAmount(potential)}</p>
                    </div>
                  </div>
                </div>

                {/* Progress stats */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-base font-bold text-foreground">{challenge.completedDays.length}/{challenge.targetDays}</p>
                    <p className="text-[10px] text-muted-foreground">{TRANSLATIONS.daysCompleted[lang]}</p>
                  </div>
                  <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-base font-bold text-amber-500">{streak}</p>
                    <p className="text-[10px] text-muted-foreground">{TRANSLATIONS.currentStreak[lang]}</p>
                  </div>
                </div>

                {/* Mark today */}
                {challenge.isActive && !markedToday && (
                  <div className="space-y-1.5">
                    <p className="text-center text-xs text-muted-foreground">{TRANSLATIONS.markToday[lang]}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => markDay(challenge.id, true)} size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white h-9">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {TRANSLATIONS.noSpend[lang]}
                      </Button>
                      <Button onClick={() => markDay(challenge.id, false)} variant="outline" size="sm" className="flex-1 border-red-500 text-red-500 hover:bg-red-50 h-9">
                        <X className="w-3.5 h-3.5 mr-1" />
                        {TRANSLATIONS.didSpend[lang]}
                      </Button>
                    </div>
                  </div>
                )}
                {challenge.isActive && markedToday && (
                  <div className="text-center py-1">
                    {isDaySuccess(challenge) ? (
                      <div className="flex items-center justify-center gap-1.5 text-green-500">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">{TRANSLATIONS.keepGoing[lang]} +{formatAmount(challenge.dailyAmount)} 💰</span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">{lang === "en" ? "Tomorrow is a new day! 💪" : lang === "ru" ? "Завтра новый день! 💪" : "Ertaga yangi kun! 💪"}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 safe-area-inset">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => { triggerLight(); onBack(); }} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{TRANSLATIONS.title[lang]}</h1>
          <p className="text-xs text-muted-foreground">{TRANSLATIONS.subtitle[lang]}</p>
        </div>
      </div>

      {/* Total savings summary (when there are active challenges) */}
      {activeChallenges.length > 0 && (
        <Card className="p-3 mb-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS.totalSaved[lang]}</p>
                <p className="text-lg font-bold text-green-600">{formatAmount(totalSaved)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS.totalPotential[lang]}</p>
              <p className="text-sm font-semibold text-muted-foreground">{formatAmount(totalPotential)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Challenges List */}
      {activeChallenges.length > 0 ? (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">{TRANSLATIONS.activeChallenges[lang]}</h2>
          <div className="space-y-2">
            {activeChallenges.map(renderChallengeCard)}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
          <Gift className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground mb-1">{TRANSLATIONS.noChallenges[lang]}</h2>
          <p className="text-sm text-muted-foreground mb-4">{TRANSLATIONS.startFirst[lang]}</p>
        </motion.div>
      )}

      {/* New Challenge Button */}
      <Button onClick={() => { triggerLight(); setShowNewChallenge(true); }} variant="outline" className="w-full mb-5">
        <Plus className="w-4 h-4 mr-2" />
        {TRANSLATIONS.newChallenge[lang]}
      </Button>

      {/* Past Challenges */}
      {pastChallenges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">{TRANSLATIONS.completedChallenges[lang]}</h2>
          <div className="space-y-2">
            {pastChallenges.slice(0, 10).map((challenge) => {
              const saved = getSavedAmount(challenge);
              const pct = challenge.targetDays > 0 ? Math.round((challenge.completedDays.length / challenge.targetDays) * 100) : 0;
              return (
                <Card key={challenge.id} className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{challenge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {challenge.completedDays.length}/{challenge.targetDays} {TRANSLATIONS.days[lang]} • {formatAmount(saved)} {TRANSLATIONS.youSaved[lang].toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500 shrink-0">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">{pct}%</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* New Challenge Modal */}
      {showNewChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[90] bg-black/50 flex items-start sm:items-center justify-center px-3 pt-[calc(var(--safe-area-top)+0.75rem)] pb-[calc(var(--tab-bar-height)+var(--safe-area-bottom)+1.5rem)] sm:p-4 overflow-hidden"
          onClick={() => setShowNewChallenge(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background rounded-2xl h-full max-h-full sm:h-auto sm:max-h-[88vh] shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{TRANSLATIONS.newChallenge[lang]}</h2>
              <p className="text-xs text-muted-foreground">{TRANSLATIONS.selectType[lang]}</p>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              <div className="space-y-2">
                {CHALLENGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      triggerLight();
                      setSelectedPreset(preset.id);
                      setDailyAmount(String(preset.defaultAmount));
                    }}
                    className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedPreset === preset.id ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">{preset.icon}</span>
                      <div className="text-left min-w-0">
                        <span className="text-foreground text-sm font-medium block truncate">{getPresetName(preset.id)}</span>
                        <span className="text-xs text-muted-foreground">{preset.days} {TRANSLATIONS.days[lang]}</span>
                      </div>
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPreset === preset.id ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {selectedPreset === preset.id && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                ))}
              </div>

              {selectedPreset === "custom" && (
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={lang === "en" ? "Challenge name..." : lang === "ru" ? "Название челленджа..." : "Chellenj nomi..."}
                />
              )}

              {/* Daily amount input */}
              {selectedPreset && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{TRANSLATIONS.dailyAmount[lang]}</label>
                  <Input
                    type="number"
                    value={dailyAmount}
                    onChange={(e) => setDailyAmount(e.target.value)}
                    placeholder="50000"
                  />
                  <p className="text-xs text-muted-foreground">{TRANSLATIONS.dailyAmountHint[lang]}</p>
                  {parseInt(dailyAmount) > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2.5 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                          {TRANSLATIONS.youCouldSave[lang]}: {formatAmount((parseInt(dailyAmount) || 0) * (CHALLENGE_PRESETS.find(p => p.id === selectedPreset)?.days || 7))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-border bg-background/95 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={() => setShowNewChallenge(false)} className="flex-1">
                {TRANSLATIONS.cancel[lang]}
              </Button>
              <Button onClick={startChallenge} disabled={!selectedPreset} className="flex-1 bg-primary">
                {TRANSLATIONS.startChallenge[lang]}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
