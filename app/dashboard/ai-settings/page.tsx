'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { AIProviderConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Settings, Plus, Trash2, Zap, Server, Key, Bot } from 'lucide-react';
import { toast } from 'sonner';

const providerPresets = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', model: '' },
  { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: '' },
  { name: 'Custom', baseUrl: '', model: '' },
];

export default function AISettingsPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [providerName, setProviderName] = useState('OpenAI');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-4o');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, [user]);

  async function loadConfigs() {
    if (!user) return;
    const { data } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setConfigs(data || []);
    setLoading(false);
  }

  function applyPreset(name: string) {
    const preset = providerPresets.find((p) => p.name === name);
    if (preset) {
      setProviderName(preset.name);
      setBaseUrl(preset.baseUrl);
      if (preset.model) setModelName(preset.model);
    }
  }

  function resetForm() {
    setProviderName('OpenAI');
    setBaseUrl('https://api.openai.com/v1');
    setApiKey('');
    setModelName('gpt-4o');
    setIsActive(true);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(config: AIProviderConfig) {
    setEditingId(config.id);
    setProviderName(config.provider_name);
    setBaseUrl(config.base_url);
    setApiKey(config.api_key);
    setModelName(config.model_name);
    setIsActive(config.is_active);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim() || !modelName.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('ai_provider_configs')
        .update({
          provider_name: providerName,
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model_name: modelName.trim(),
          is_active: isActive,
        })
        .eq('id', editingId);
      if (error) {
        toast.error('Failed to update provider');
      } else {
        toast.success('Provider updated');
        resetForm();
        loadConfigs();
      }
    } else {
      const { error } = await supabase
        .from('ai_provider_configs')
        .insert({
          provider_name: providerName,
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model_name: modelName.trim(),
          is_active: isActive,
        });
      if (error) {
        toast.error('Failed to create provider');
      } else {
        toast.success('Provider added');
        resetForm();
        loadConfigs();
      }
    }
    setSaving(false);
  }

  async function deleteConfig(id: string) {
    const { error } = await supabase.from('ai_provider_configs').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete provider');
    } else {
      toast.success('Provider deleted');
      setConfigs(configs.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('ai_provider_configs').update({ is_active: active }).eq('id', id);
    loadConfigs();
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">AI Provider Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI providers for code reviews</p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        )}
      </div>

      {/* Existing providers */}
      {configs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No AI providers configured</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add an AI provider to start reviewing code. Supports OpenAI, LM Studio, Ollama, and more.
            </p>
            <Button onClick={() => setShowForm(true)}>Add your first provider</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 mb-6">
          {configs.map((config) => (
            <Card key={config.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Server className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{config.provider_name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          config.is_active
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{config.base_url} &middot; {config.model_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={(checked) => toggleActive(config.id, checked)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => startEdit(config)}>Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete provider?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove &quot;{config.provider_name}&quot; from your AI providers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteConfig(config.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Edit Provider' : 'Add Provider'}</CardTitle>
            <CardDescription>Configure an OpenAI-compatible API provider</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Provider Preset</Label>
                <Select value={providerName} onValueChange={(val) => applyPreset(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerPresets.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Base URL
                </Label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Model Name
                </Label>
                <Input
                  placeholder="gpt-4o, llama3, etc."
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Provider' : 'Add Provider'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
