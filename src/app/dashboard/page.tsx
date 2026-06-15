'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, TrendingDown, Minus, Star, MessageSquare, BarChart2, ArrowRight } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { getFeedbackDashboard, getFeedbackList } from '@/lib/api';
import type { Feedback } from '@/lib/types';

interface DashboardData {
  yesterday: {
    total: number;
    positivePercent: number;
    mainComplaint: string;
    mostPraised: string;
  };
  heatmap: {
    food: number | null;
    service: number | null;
    ambiance: number | null;
  };
  aiSummary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sentimentColor(pct: number | null) {
  if (pct == null) return { bg: 'bg-gray-100', bar: 'bg-gray-300', text: 'text-gray-400', label: '—' };
  if (pct >= 75) return { bg: 'bg-green-50', bar: 'bg-green-500', text: 'text-green-700', label: 'Positive' };
  if (pct >= 50) return { bg: 'bg-yellow-50', bar: 'bg-yellow-400', text: 'text-yellow-700', label: 'Mixed' };
  return { bg: 'bg-red-50', bar: 'bg-red-400', text: 'text-red-700', label: 'Needs work' };
}

const EMOTION_STYLES: Record<string, string> = {
  Excited: 'bg-purple-100 text-purple-700',
  Satisfied: 'bg-blue-100 text-blue-700',
  Neutral: 'bg-gray-100 text-gray-600',
  Disappointed: 'bg-orange-100 text-orange-700',
  Angry: 'bg-red-100 text-red-700',
};

const SENTIMENT_STYLES: Record<string, string> = {
  Positive: 'bg-green-100 text-green-700',
  Neutral: 'bg-gray-100 text-gray-600',
  Negative: 'bg-red-100 text-red-700',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Heatmap area row ──────────────────────────────────────────────────────────
function AreaRow({ label, pct }: { label: string; pct: number | null }) {
  const c = sentimentColor(pct);
  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 ${c.bg}`}>
      <div className="w-20 shrink-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className={`text-xs font-medium mt-0.5 ${c.text}`}>{c.label}</p>
      </div>
      <div className="flex-1">
        <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
            style={{ width: pct != null ? `${pct}%` : '0%' }}
          />
        </div>
      </div>
      <p className={`text-lg font-black shrink-0 ${c.text}`}>
        {pct != null ? `${pct}%` : '—'}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [recent, setRecent] = useState<Feedback[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    getFeedbackDashboard()
      .then(({ data }) => setDashboard(data.data))
      .catch(() => {})
      .finally(() => setDashLoading(false));

    getFeedbackList(1, 8, '-createdAt')
      .then(({ data }) => setRecent(data.doc || []))
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  const { yesterday, heatmap, aiSummary } = dashboard ?? {
    yesterday: { total: 0, positivePercent: 0, mainComplaint: '', mostPraised: '' },
    heatmap: { food: null, service: null, ambiance: null },
    aiSummary: '',
  };

  const feedbacksWithInsights = recent.filter((f) => f.aiInsight);

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI-powered insights from your customer feedback</p>
      </div>

      {dashLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Morning Briefing ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Yesterday&apos;s Briefing</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Total Responses</p>
                <p className="text-3xl font-black text-gray-900">{yesterday.total}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Positive</p>
                <p className={`text-3xl font-black ${yesterday.positivePercent >= 70 ? 'text-green-600' : yesterday.positivePercent >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {yesterday.positivePercent}%
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown size={12} className="text-red-400" />
                  <p className="text-xs text-gray-400 font-medium">Top Complaint</p>
                </div>
                <p className="text-sm font-bold text-red-500 leading-snug">
                  {yesterday.mainComplaint || <span className="text-gray-300 font-normal">—</span>}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-green-400" />
                  <p className="text-xs text-gray-400 font-medium">Most Praised</p>
                </div>
                <p className="text-sm font-bold text-green-600 leading-snug">
                  {yesterday.mostPraised || <span className="text-gray-300 font-normal">—</span>}
                </p>
              </div>
            </div>
          </section>

          {/* ── AI Sentiment Heatmap ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={15} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">AI Sentiment Heatmap</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              <AreaRow label="Food" pct={heatmap.food} />
              <AreaRow label="Service" pct={heatmap.service} />
              <AreaRow label="Ambiance" pct={heatmap.ambiance} />
            </div>
          </section>

          {/* ── AI Summary ───────────────────────────────────────────────── */}
          {aiSummary && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">AI Insight</h2>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
                <p className="text-sm text-indigo-800 leading-relaxed font-medium">💡 {aiSummary}</p>
              </div>
            </section>
          )}

          {/* ── Per-feedback AI Insights ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Feedback — AI Analysis</h2>
              </div>
              <Link href="/feedback" className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                <Star size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No feedback yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((fb) => (
                  <div key={fb._id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Customer + date */}
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {fb.name || <span className="text-gray-400 font-normal italic">Anonymous</span>}
                          </p>
                          {fb.orderRef && (
                            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                              #{fb.orderRef}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto shrink-0">{fmtDate(fb.createdAt)}</span>
                        </div>

                        {/* AI emotion + sentiment badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {fb.aiSentiment && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_STYLES[fb.aiSentiment] ?? 'bg-gray-100 text-gray-600'}`}>
                              {fb.aiSentiment}
                            </span>
                          )}
                          {fb.aiEmotion && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EMOTION_STYLES[fb.aiEmotion] ?? 'bg-gray-100 text-gray-600'}`}>
                              {fb.aiEmotion}
                            </span>
                          )}
                          {fb.ratingOverall && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                              {'★'.repeat(fb.ratingOverall)}{'☆'.repeat(5 - fb.ratingOverall)} {fb.ratingOverall}/5
                            </span>
                          )}
                        </div>

                        {/* Voice */}
                        {fb.voiceUrl && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-purple-600 mb-1">🎙 Voice review</p>
                            <audio controls src={fb.voiceUrl} className="w-full h-8" />
                          </div>
                        )}

                        {/* Comment */}
                        {fb.comment && (
                          <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-2">
                            &ldquo;{fb.comment}&rdquo;
                          </p>
                        )}

                        {/* AI Insight */}
                        {fb.aiInsight && (
                          <div className="flex items-start gap-2 bg-indigo-50 rounded-lg px-3 py-2">
                            <Sparkles size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-indigo-700 leading-relaxed">{fb.aiInsight}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* No insights yet */}
          {!recentLoading && feedbacksWithInsights.length === 0 && recent.length > 0 && (
            <p className="text-xs text-gray-400 text-center pb-2">
              AI insights are generated after new feedback is submitted.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
