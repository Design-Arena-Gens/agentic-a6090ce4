'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  Bot,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  FileText,
  Files,
  Hash,
  LucideIcon,
  MessageSquareText,
  NotebookPen,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { defaultFiles, defaultNotes, defaultReminders, defaultTasks } from '../lib/defaultData';
import { formatDateTime, formatFileSize, uid } from '../lib/utils';
import { usePersistentState } from '../lib/usePersistentState';

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
};

type Reminder = {
  id: string;
  title: string;
  scheduledFor: string;
  channel: 'mobile' | 'email' | 'push';
};

type FileResource = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  description?: string;
  previewUrl?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

const priorityTokens: Record<Task['priority'], string> = {
  high: 'High Impact',
  medium: 'Momentum',
  low: 'Nice to Have'
};

const channelTokens: Record<Reminder['channel'], string> = {
  mobile: 'Mobile Push',
  email: 'Email Digest',
  push: 'Desktop Push'
};

const bubbleResponses = {
  greeting: [
    'Let me sync your focus: three open loops and two reminders wanting attention.',
    'I triaged your brain: momentum is high, clarity is one nudge away.'
  ],
  tasks: [
    'Two tasks are still open. Want me to chunk the top priority into sub-steps?',
    'The roadmap prioritization task is still active. Blocking it will unlock the rest.'
  ],
  notes: [
    'Pinned note “Morning Reflection” is fueling today’s intent.',
    'Latest note highlights: double down on automations, refine onboarding, prep investor deck.'
  ]
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

export default function Home() {
  const [notes, setNotes] = usePersistentState<Note[]>(
    'neuronest.notes',
    defaultNotes.map((note) => ({ ...note, tags: [...note.tags] }))
  );
  const [tasks, setTasks] = usePersistentState<Task[]>(
    'neuronest.tasks',
    defaultTasks.map((task) => ({ ...task }))
  );
  const [reminders, setReminders] = usePersistentState<Reminder[]>(
    'neuronest.reminders',
    defaultReminders.map((reminder) => ({ ...reminder }))
  );
  const [files, setFiles] = usePersistentState<FileResource[]>(
    'neuronest.files',
    defaultFiles.map((file) => ({ ...file }))
  );
  const [chatMessages, setChatMessages] = usePersistentState<ChatMessage[]>(
    'neuronest.chat',
    [
      {
        id: 'chat-welcome',
        role: 'assistant',
        content:
          'Hey visionary. I am your NeuroNest guide—surfacing insights, nudging focus, and stitching context across notes, tasks, reminders, and files.',
        timestamp: new Date().toISOString()
      }
    ]
  );

  const [noteDraft, setNoteDraft] = useState({ title: '', content: '', tags: '' });
  const [taskDraft, setTaskDraft] = useState({ title: '', dueDate: '', priority: 'medium' as Task['priority'] });
  const [reminderDraft, setReminderDraft] = useState({ title: '', scheduledFor: '', channel: 'mobile' as Reminder['channel'] });
  const [fileNotes, setFileNotes] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isChatOpen) return;
    const el = chatListRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedTasks = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const openTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const nextReminder = useMemo(() => {
    const upcoming = reminders
      .filter((reminder) => new Date(reminder.scheduledFor).getTime() >= Date.now())
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    return upcoming[0];
  }, [reminders]);

  const noteHighlights = useMemo(() => {
    const pinned = notes.filter((note) => note.pinned);
    return pinned.length ? pinned : notes.slice(0, 2);
  }, [notes]);

  const progressScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [completedTasks, tasks.length]);

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteDraft.title.trim() && !noteDraft.content.trim()) return;
    const now = new Date().toISOString();
    setNotes((prev) => [
      {
        id: `note-${uid()}`,
        title: noteDraft.title.trim() || 'Untitled Note',
        content: noteDraft.content.trim(),
        tags: noteDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        pinned: false,
        createdAt: now,
        updatedAt: now
      },
      ...prev
    ]);
    setNoteDraft({ title: '', content: '', tags: '' });
  }

  function archiveNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev
        .map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    );
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskDraft.title.trim()) return;
    setTasks((prev) => [
      {
        id: `task-${uid()}`,
        title: taskDraft.title.trim(),
        done: false,
        dueDate: taskDraft.dueDate || undefined,
        priority: taskDraft.priority
      },
      ...prev
    ]);
    setTaskDraft({ title: '', dueDate: '', priority: taskDraft.priority });
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderDraft.title.trim()) return;
    const due = reminderDraft.scheduledFor || new Date(Date.now() + 3600_000).toISOString();
    setReminders((prev) => [
      {
        id: `reminder-${uid()}`,
        title: reminderDraft.title.trim(),
        scheduledFor: due,
        channel: reminderDraft.channel
      },
      ...prev
    ]);
    setReminderDraft({ title: '', scheduledFor: '', channel: reminderDraft.channel });
  }

  function removeReminder(id: string) {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  }

  function handleFileUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const input = target.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input || !input.files || input.files.length === 0) return;

    const uploadedAt = new Date().toISOString();
    const entries: FileResource[] = Array.from(input.files).map((file) => ({
      id: `file-${uid()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt,
      description: fileNotes.trim() || undefined,
      previewUrl: URL.createObjectURL(file)
    }));

    setFiles((prev) => [...entries, ...prev]);
    input.value = '';
    setFileNotes('');
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const entry = prev.find((file) => file.id === id);
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((file) => file.id !== id);
    });
  }

  function craftAssistantReply(prompt: string) {
    const lower = prompt.toLowerCase();

    if (lower.includes('note')) {
      const highlight = notes[0];
      if (highlight) {
        return `Your latest note “${highlight.title}” points to ${highlight.content.slice(0, 120)}... Want me to turn that into next tasks?`;
      }
    }

    if (lower.includes('task') || lower.includes('todo')) {
      if (openTasks.length) {
        const next = openTasks[0];
        const due = next.dueDate ? ` due ${formatDateTime(next.dueDate)}` : '';
        return `Focus anchor: ${next.title}${due}. I can break it down or schedule a block—just say “plan it”.`;
      }
      return 'Inbox zero achieved. Ready for a brain dump to capture the next wave?';
    }

    if (lower.includes('remind') || lower.includes('schedule')) {
      if (nextReminder) {
        return `Next reminder is “${nextReminder.title}” via ${channelTokens[nextReminder.channel]} at ${formatDateTime(nextReminder.scheduledFor)}.`;
      }
      return 'You are reminder-free. Want me to set a cadence to review goals?';
    }

    if (lower.includes('file')) {
      const doc = files[0];
      if (doc) {
        return `Latest file is ${doc.name} (${formatFileSize(doc.size)}). I can summarize or extract actions if you need.`;
      }
    }

    const responses = [
      ...bubbleResponses.greeting,
      ...(openTasks.length ? bubbleResponses.tasks : []),
      ...(noteHighlights.length ? bubbleResponses.notes : [])
    ];
    return responses[Math.floor(Math.random() * responses.length)] ??
      'Your system is synced. Ask for a focus plan or capture something new.';
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = pendingMessage.trim();
    if (!content || isThinking) return;

    const userMessage: ChatMessage = {
      id: `chat-${uid()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setPendingMessage('');
    setIsThinking(true);

    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: `chat-${uid()}`,
        role: 'assistant',
        content: craftAssistantReply(content),
        timestamp: new Date().toISOString()
      };
      setChatMessages((prev) => [...prev, reply]);
      setIsThinking(false);
    }, 650);
  }

  const today = new Date();

  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6 pb-28">
      <div className="absolute inset-x-0 top-0 -z-20 h-72 bg-gradient-to-b from-brand/30 via-slate-900 to-slate-950" />
      <header id="top" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200/60">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Good {getGreeting()}, Operator</h1>
          </div>
          <div className="glass flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-brand-light shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
        <div className="glass grid grid-cols-2 gap-3 rounded-3xl p-4">
          <StatCard
            label="Momentum"
            value={`${progressScore}%`
            }
            delta={openTasks.length ? `${openTasks.length} tasks in motion` : 'All tasks cleared'}
            icon={<CheckSquare className="h-8 w-8" />}
          />
          <StatCard
            label="Knowledge Nodes"
            value={`${notes.length}`}
            delta={noteHighlights[0] ? `Pinned: ${noteHighlights[0].title}` : 'Capture your first insight'}
            icon={<NotebookPen className="h-8 w-8" />}
          />
          <StatCard
            label="Upcoming"
            value={nextReminder ? formatDateTime(nextReminder.scheduledFor).split(',')[0] : 'Clear'}
            delta={nextReminder ? nextReminder.title : 'No reminders queued'}
            icon={<AlarmClock className="h-8 w-8" />}
            className="col-span-2"
          />
        </div>
      </header>

      <SectionCard
        id="notes"
        title="Notes"
        subtitle="Capture, pin, and synthesize your thinking"
        action={
          <button
            type="button"
            onClick={() => {
              const panel = document.getElementById('note-draft');
              panel?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-200/80"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-inner transition hover:border-brand/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">{note.title}</h3>
                  <p className="text-sm text-slate-200/80">
                    {note.content || 'Empty note. Drop your thoughts here to give them a home.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => togglePin(note.id)}
                    className="inline-flex rounded-full border border-white/10 bg-slate-900/70 p-2 text-xs text-slate-200/70 transition hover:text-brand-light"
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    {note.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveNote(note.id)}
                    className="text-xs text-slate-400 hover:text-rose-300"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300/80">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
                  <CalendarCheck className="h-3 w-3" />
                  {formatDateTime(note.updatedAt)}
                </span>
                {note.tags.map((tag) => (
                  <span key={`${note.id}-${tag}`} className="inline-flex items-center gap-1 rounded-full bg-brand/20 px-2 py-1 text-brand-light">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <form id="note-draft" onSubmit={addNote} className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <input
            value={noteDraft.title}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Note title"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
          <textarea
            value={noteDraft.content}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Capture your thought, decision, or idea"
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
          <input
            value={noteDraft.tags}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="Tags (comma separated)"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light"
          >
            <Sparkles className="h-4 w-4" />
            Capture Insight
          </button>
        </form>
      </SectionCard>

      <SectionCard id="tasks" title="To-Do" subtitle="Action the signals your brain collects">
        <form onSubmit={addTask} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <input
            value={taskDraft.title}
            onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Task to capture"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="datetime-local"
              value={taskDraft.dueDate}
              onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white focus:border-brand"
            />
            <select
              value={taskDraft.priority}
              onChange={(event) => setTaskDraft((prev) => ({ ...prev, priority: event.target.value as Task['priority'] }))}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white focus:border-brand"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button type="submit" className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light">
            <Plus className="h-4 w-4" />
            Queue Task
          </button>
        </form>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  task.done ? 'border-brand bg-brand/20 text-brand-light' : 'border-white/20 text-slate-400'
                }`}
                aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
              >
                {task.done ? <CheckSquare className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-medium ${task.done ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</p>
                    <p className="text-xs text-slate-300/70">{priorityTokens[task.priority]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="text-xs text-slate-400 hover:text-rose-300"
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300/80">
                  {task.dueDate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
                      <CalendarCheck className="h-3 w-3" />
                      {formatDateTime(task.dueDate)}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
                    <Hash className="h-3 w-3" />
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard id="reminders" title="Reminders" subtitle="Never lose track of the commitments you make to yourself">
        <form onSubmit={addReminder} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <input
            value={reminderDraft.title}
            onChange={(event) => setReminderDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Reminder title"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-brand"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="datetime-local"
              value={reminderDraft.scheduledFor}
              onChange={(event) => setReminderDraft((prev) => ({ ...prev, scheduledFor: event.target.value }))}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white focus:border-brand"
            />
            <select
              value={reminderDraft.channel}
              onChange={(event) => setReminderDraft((prev) => ({ ...prev, channel: event.target.value as Reminder['channel'] }))}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white focus:border-brand"
            >
              <option value="mobile">Mobile Push</option>
              <option value="email">Email Digest</option>
              <option value="push">Desktop Push</option>
            </select>
          </div>
          <button type="submit" className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light">
            <AlarmClock className="h-4 w-4" />
            Schedule Reminder
          </button>
        </form>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{reminder.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300/80">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
                    <CalendarCheck className="h-3 w-3" />
                    {formatDateTime(reminder.scheduledFor)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
                    <MessageSquareText className="h-3 w-3" />
                    {channelTokens[reminder.channel]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeReminder(reminder.id)}
                className="text-xs text-slate-400 hover:text-rose-300"
                aria-label="Remove reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard id="files" title="Files" subtitle="Anchor your knowledge graph with documents and assets">
        <form onSubmit={handleFileUpload} className="space-y-3 rounded-2xl border border-dashed border-brand/40 bg-slate-900/40 p-5 text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-brand-light" />
          <p className="text-sm text-slate-200/80">Drop documents to keep context close. I’ll weave them into your notes and tasks.</p>
          <input
            type="file"
            multiple
            className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
          <textarea
            value={fileNotes}
            onChange={(event) => setFileNotes(event.target.value)}
            placeholder="Optional context I should remember about these files"
            rows={2}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-brand"
          />
          <button type="submit" className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light">
            Ingest Files
          </button>
        </form>
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand/20 text-brand-light">
                <Files className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-300/80">
                      {formatFileSize(file.size)} · {file.type || 'Unknown type'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-xs text-slate-400 hover:text-rose-300"
                    aria-label="Remove file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {file.description ? <p className="text-xs text-slate-200/80">{file.description}</p> : null}
                {file.previewUrl ? (
                  <a
                    href={file.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-200/80 transition hover:border-brand"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Preview
                  </a>
                ) : null}
                <p className="text-xs text-slate-300/70">Uploaded {formatDateTime(file.uploadedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <nav className="fixed bottom-6 left-1/2 z-40 w-[90%] max-w-md -translate-x-1/2">
        <div className="glass flex items-center justify-around rounded-full border border-white/10 px-4 py-3 text-xs text-slate-300">
          <BottomLink href="#top" icon={NotebookPen} label="Home" />
          <BottomLink href="#notes" icon={FileText} label="Notes" />
          <BottomLink href="#tasks" icon={CheckSquare} label="Tasks" />
          <BottomLink href="#reminders" icon={AlarmClock} label="Remind" />
          <BottomLink href="#files" icon={Files} label="Files" />
        </div>
      </nav>

      <AiBubble
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((open) => !open)}
        messages={chatMessages}
        setPendingMessage={setPendingMessage}
        pendingMessage={pendingMessage}
        isThinking={isThinking}
        onSubmit={sendMessage}
        chatListRef={chatListRef}
      />
    </main>
  );
}

function BottomLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <a href={href} className="flex flex-col items-center gap-1 text-slate-300/80 transition hover:text-white">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </a>
  );
}

interface AiBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  isThinking: boolean;
  pendingMessage: string;
  setPendingMessage: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  chatListRef: React.RefObject<HTMLDivElement>;
}

function AiBubble({
  isOpen,
  onToggle,
  messages,
  isThinking,
  pendingMessage,
  setPendingMessage,
  onSubmit,
  chatListRef
}: AiBubbleProps) {
  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3 md:right-10">
      <div
        className={`transition-all duration-200 ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="glass w-80 max-w-[calc(100vw-3rem)] rounded-3xl border border-white/10 p-4 shadow-xl">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">NeuroNest AI</p>
              <p className="text-xs text-slate-300/80">Synthesizing your second brain</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-full border border-white/10 bg-slate-900/70 p-2 text-slate-300/80"
              aria-label="Collapse chat"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </header>
          <div ref={chatListRef} className="scrollbar-hidden mb-3 max-h-72 space-y-3 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'assistant'
                      ? 'bg-slate-900/80 text-slate-100'
                      : 'bg-brand text-white'
                  }`}
                >
                  <p>{message.content}</p>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-white/50">
                    {new Date(message.timestamp).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isThinking ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand/70" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand/40" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3">
            <input
              value={pendingMessage}
              onChange={(event) => setPendingMessage(event.target.value)}
              placeholder="Ask me to synthesize, plan, or focus"
              className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!pendingMessage.trim() || isThinking}
              className="rounded-full bg-brand px-3 py-2 text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="glass flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-brand-light shadow-xl transition hover:scale-105"
        aria-label="Open AI assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}
