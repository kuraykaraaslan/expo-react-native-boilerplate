import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBookmark, faClockRotateLeft, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Button, Card, EmptyState, Input, Spinner, Text } from '@/components/ui';
import { env } from '@/libs/env';
import { handleApiError } from '@/libs/errorUtils';
import { searchTarget } from '@/libs/searchRoutes';
import { useDebouncedValue } from '@/libs/useDebouncedValue';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { SavedSearch, SearchHistoryEntry, SearchHit } from '@/services/platform/search.dto';
import { SEARCH_PAGE_SIZE, SearchClientService } from '@/services/platform/search.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { humanizeEntityType, parseSnippet } from '@/utils/search';

const DEBOUNCE_MS = 350;
const MAX_QUERY = 200; // the server rejects longer queries

type Row = { kind: 'header'; type: string } | { kind: 'hit'; hit: SearchHit };

/** Groups hits by entity type, keeping the server's ranking order within and between groups. */
function toRows(hits: SearchHit[]): Row[] {
  const order: string[] = [];
  const byType = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    if (!byType.has(hit.entityType)) {
      byType.set(hit.entityType, []);
      order.push(hit.entityType);
    }
    byType.get(hit.entityType)?.push(hit);
  }
  return order.flatMap((type) => [{ kind: 'header' as const, type }, ...(byType.get(type) ?? []).map((hit) => ({ kind: 'hit' as const, hit }))]);
}

function HitRow({ hit, onPress }: { hit: SearchHit; onPress: () => void }) {
  const parts = parseSnippet(hit.snippet);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hit.title}
      testID={`search-hit-${hit.entityType}-${hit.entityId}`}
      className="gap-0.5 border-b border-border px-4 py-3 active:bg-surface-overlay"
    >
      <Text className="text-sm font-medium text-text-primary" numberOfLines={2}>
        {hit.title}
      </Text>
      {parts.length > 0 ? (
        <Text className="text-xs text-text-secondary" numberOfLines={3}>
          {parts.map((p, i) => (
            <Text key={i} className={p.bold ? 'text-xs font-semibold text-text-primary' : 'text-xs text-text-secondary'}>
              {p.text}
            </Text>
          ))}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const listStyle = useListContentStyle();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim().slice(0, MAX_QUERY), DEBOUNCE_MS);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const inFlight = useRef<AbortController | null>(null);
  /** Bumped when the query or organization changes: answers that started under an older value are dropped. */
  const epoch = useRef(0);
  const tenantEpoch = useRef(0);

  const loadSidebars = useCallback(async () => {
    const mine = tenantEpoch.current;
    const [h, s] = await Promise.allSettled([SearchClientService.getHistory(10), SearchClientService.getSaved()]);
    if (tenantEpoch.current !== mine) return; // another organization is on screen now
    setHistory(h.status === 'fulfilled' ? h.value : []);
    setSaved(s.status === 'fulfilled' ? s.value : []);
  }, []);

  // Another organization has its own index, history and saved searches: start clean.
  useEffect(() => {
    tenantEpoch.current += 1;
    epoch.current += 1;
    inFlight.current?.abort();
    setInput('');
    setHits([]);
    setTotal(0);
    setFailed(false);
    setHistory([]);
    setSaved([]);
    void loadSidebars();
  }, [tenantId, loadSidebars]);

  useEffect(() => {
    epoch.current += 1;
    inFlight.current?.abort();
    if (!query) {
      setHits([]);
      setTotal(0);
      setFailed(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setFailed(false);
    SearchClientService.search(query, { signal: controller.signal })
      .then((res) => {
        setHits(res.hits);
        setTotal(res.total);
        void loadSidebars(); // the server just logged this query into the history
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return; // superseded by a newer query
        setFailed(true);
        setHits([]); // never show the previous query's rows under this query's error
        setTotal(0);
        handleApiError(err, 'SearchScreen.search');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, tenantId, loadSidebars]);

  async function loadMore() {
    if (loading || loadingMore || hits.length >= total || !query) return;
    setLoadingMore(true);
    const mine = epoch.current;
    try {
      const res = await SearchClientService.search(query, { offset: hits.length });
      if (epoch.current !== mine) return; // the query or organization changed while this page was loading
      setHits((prev) => [...prev, ...res.hits]);
      setTotal(res.total);
    } catch (err: unknown) {
      handleApiError(err, 'SearchScreen.loadMore');
    } finally {
      setLoadingMore(false);
    }
  }

  async function open(hit: SearchHit) {
    const target = searchTarget(hit, env.EXPO_PUBLIC_FRONTEND_URL);
    if (target.kind === 'route') router.push(target.href);
    else if (target.kind === 'web') await WebBrowser.openBrowserAsync(target.url).catch(() => undefined);
    else toast.info(t('SEARCH.NO_TARGET'));
  }

  async function saveCurrent() {
    try {
      const item = await SearchClientService.save({ name: query.slice(0, 120), query });
      setSaved((prev) => [item, ...prev]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('SEARCH.SAVED'));
    } catch (err: unknown) {
      handleApiError(err, 'SearchScreen.save');
    }
  }

  async function removeSaved(item: SavedSearch) {
    try {
      await SearchClientService.deleteSaved(item.savedSearchId);
      setSaved((prev) => prev.filter((s) => s.savedSearchId !== item.savedSearchId));
    } catch (err: unknown) {
      handleApiError(err, 'SearchScreen.removeSaved');
    }
  }

  async function clearHistory() {
    try {
      await SearchClientService.clearHistory();
      setHistory([]);
    } catch (err: unknown) {
      handleApiError(err, 'SearchScreen.clearHistory');
    }
  }

  const rows = useMemo(() => toRows(hits), [hits]);
  const alreadySaved = saved.some((s) => s.query.toLowerCase() === query.toLowerCase());
  // Recent searches are shown once, without repeats of the same words.
  const recent = history.filter((h, i) => history.findIndex((x) => x.query.toLowerCase() === h.query.toLowerCase()) === i).slice(0, 8);

  const idle = (
    <View className="gap-4">
      {saved.length > 0 ? (
        <Card title={t('SEARCH.SAVED_TITLE')}>
          {saved.map((s) => (
            <View key={s.savedSearchId} className="min-h-[44px] flex-row items-center gap-2 border-b border-border py-2">
              <Pressable onPress={() => setInput(s.query)} accessibilityRole="button" className="min-w-0 flex-1 flex-row items-center gap-2" testID={`search-saved-${s.savedSearchId}`}>
                <FontAwesomeIcon icon={faBookmark} size={13} color={tokens['text-secondary']} />
                <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                  {s.name}
                </Text>
              </Pressable>
              <Pressable onPress={() => void removeSaved(s)} accessibilityRole="button" accessibilityLabel={`${t('SEARCH.REMOVE')}: ${s.name}`} hitSlop={8}>
                <FontAwesomeIcon icon={faXmark} size={14} color={tokens['text-secondary']} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
      {recent.length > 0 ? (
        <Card title={t('SEARCH.RECENT')}>
          {recent.map((h) => (
            <Pressable key={h.searchQueryLogId} onPress={() => setInput(h.query)} accessibilityRole="button" className="min-h-[44px] flex-row items-center gap-2 border-b border-border py-2" testID={`search-recent-${h.searchQueryLogId}`}>
              <FontAwesomeIcon icon={faClockRotateLeft} size={13} color={tokens['text-secondary']} />
              <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                {h.query}
              </Text>
            </Pressable>
          ))}
          <Button variant="ghost" size="sm" onPress={() => void clearHistory()} className="mt-2 self-start" testID="search-clear-history">
            {t('SEARCH.CLEAR_HISTORY')}
          </Button>
        </Card>
      ) : null}
      {saved.length === 0 && recent.length === 0 ? (
        <EmptyState icon={faMagnifyingGlass} title={t('SEARCH.IDLE')} description={t('SEARCH.IDLE_DESC')} className="py-8" />
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={query && !loading ? rows : []}
        keyExtractor={(r, i) => (r.kind === 'header' ? `h-${r.type}` : `${r.hit.entityType}-${r.hit.entityId}-${i}`)}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <ScreenHeader title={t('SEARCH.TITLE')} subtitle={t('SEARCH.SUBTITLE')} />
            <Input
              value={input}
              onChangeText={setInput}
              placeholder={t('SEARCH.PLACEHOLDER')}
              maxLength={MAX_QUERY}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearable
              onClear={() => setInput('')}
              prefixIcon={<FontAwesomeIcon icon={faMagnifyingGlass} size={14} color={tokens['text-secondary']} />}
              testID="search-input"
            />
            {query && !loading && !failed && hits.length > 0 ? (
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-xs text-text-secondary">{t('SEARCH.RESULT_COUNT', { count: total })}</Text>
                {!alreadySaved ? (
                  <Button variant="outline" size="sm" onPress={() => void saveCurrent()} testID="search-save">
                    <Text className="text-xs font-medium text-text-primary">{t('SEARCH.SAVE')}</Text>
                  </Button>
                ) : null}
              </View>
            ) : null}
            {!query ? idle : null}
            {query && loading ? <Spinner /> : null}
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">{t(`SEARCH.TYPE_${item.type}`, { defaultValue: humanizeEntityType(item.type) })}</Text>
          ) : (
            <HitRow hit={item.hit} onPress={() => void open(item.hit)} />
          )
        }
        ListEmptyComponent={
          query && !loading ? (
            failed ? (
              <EmptyState icon={faMagnifyingGlass} title={t('SEARCH.FAILED')} description={t('SEARCH.FAILED_DESC')} className="py-8" />
            ) : (
              <EmptyState icon={faMagnifyingGlass} title={t('SEARCH.EMPTY')} description={t('SEARCH.EMPTY_DESC', { query })} className="py-8" />
            )
          ) : null
        }
        ListFooterComponent={loadingMore ? <Spinner /> : null}
      />
    </Screen>
  );
}
