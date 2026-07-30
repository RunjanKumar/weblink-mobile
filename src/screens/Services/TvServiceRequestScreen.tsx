import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog, toast} from '../../components';
import {
  AssistanceCard,
  CenterState,
  DS,
  FONT,
  FootNote,
  GLASS_BLUR,
  GlassPanel,
  GlassSheen,
  SHADOW,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useReviewRequestViewModel, useServiceCatalogViewModel} from '../../viewmodels';
import {useServiceRequest} from '../../store/ServiceRequestContext';
import {formatRupees} from '../../utils';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {ServiceIcon} from './components/ServiceIcons';
import {
  DETAIL_PRESETS,
  NotePane,
  SectionTab,
  ServiceBadge,
  isCategoryAvailable,
  serviceWindow,
} from './components/TvServiceParts';
import type {ServiceCategory, ServiceSubCategory} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

/** Registered for both routes on TV — see the note on the review step below. */
type Props = NativeStackScreenProps<HomeStackParamList, 'Services' | 'ServiceReview'>;

/**
 * Service Request (TV) — the client's Figma frame, built 1:1.
 *
 * Service cards on the left, the live request list on the right, and the same
 * `ServiceRequest` cart + `useReviewRequestViewModel` the phone submits with:
 * one catalog, one selection, one POST per category.
 *
 * WHY THE PHONE'S REVIEW STEP IS GONE: on the phone, picking services and
 * reviewing them are two pages because there is no room for both. The frame puts
 * the list permanently beside the cards, so the review IS the right column —
 * which is why this component is registered for `ServiceReview` too (Chat's
 * quick-service shortcut jumps straight there).
 *
 * ADD DETAILS is not in the Figma, but the booking payload carries a
 * `description` per service and the phone flow has a whole screen for it — so
 * the list rows own it here, editing in place in the right column rather than
 * navigating away from the cards. Presets cover the common notes in one press
 * because typing on a remote is punishing.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/**
 * Service grid: 4 across, as the Figma.
 *
 * The vertical metrics are tuned so EIGHT cards — the housekeeping set the
 * client's frame shows — sit in two rows inside the panel with nothing cut off
 * and nothing to scroll. Adding height here pushes the second row under the
 * fold, which is the one thing the frame cannot afford: a guest scanning from
 * the sofa has to see every service at once.
 */
const CARD_WIDTH = '23.5%';
const CARD_GAP_Y = 11;
const CARD_ICON = 56;

/** Which pane the right column is showing. */
type RightPane = {kind: 'list'} | {kind: 'note'; sub: ServiceSubCategory};

type CardState = 'request' | 'selected' | 'sent' | 'unavailable';

/* ── One service ── */
function ServiceCard({
  sub,
  state,
  onPress,
}: {
  sub: ServiceSubCategory;
  state: CardState;
  onPress: () => void;
}) {
  const selected = state === 'selected';
  const sent = state === 'sent';
  const unavailable = state === 'unavailable';

  const button = {
    request: {label: '+ REQUEST', color: DS.champagne, bg: 'rgba(255,255,255,0.06)', border: 'rgba(212,180,131,0.55)'},
    selected: {label: '✓ ADDED', color: DS.text, bg: DS.gold, border: '#E5CFA5'},
    sent: {label: 'ON ITS WAY', color: '#8FD9A8', bg: 'rgba(143,217,168,0.14)', border: 'rgba(143,217,168,0.5)'},
    unavailable: {label: 'UNAVAILABLE', color: DS.muted, bg: 'rgba(255,255,255,0.04)', border: DS.borderSoft},
  }[state];

  return (
    <View
      style={{
        width: CARD_WIDTH,
        marginBottom: CARD_GAP_Y,
        borderRadius: DS.radius,
        borderWidth: 1,
        borderColor: selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft,
        backgroundColor: selected ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.055)',
        overflow: 'hidden',
        paddingTop: 14,
        paddingHorizontal: 10,
        paddingBottom: 9,
        alignItems: 'center',
        // A closed category is dimmed, not hidden — the guest still needs to see
        // what the hotel offers and when it comes back.
        opacity: unavailable ? 0.5 : 1,
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      <GlassSheen strength={0.5} />

      <ServiceIcon
        name={sub.name}
        description={sub.description}
        size={CARD_ICON}
        color={selected ? DS.gold : sent ? '#8FD9A8' : 'rgba(255,255,255,0.66)'}
      />

      <Text
        numberOfLines={1}
        style={{color: DS.text, fontSize: 13, fontWeight: '500', marginTop: 8, fontFamily: FONT}}>
        {sub.name ?? 'Service'}
      </Text>
      {/* Fixed two-line slot: the descriptions run one to three lines and the
          cards must keep a single baseline across the row. */}
      <View style={{height: 28, justifyContent: 'flex-start', marginTop: 3}}>
        <Text
          numberOfLines={2}
          style={{color: DS.text2, fontSize: 10, lineHeight: 14, textAlign: 'center', fontFamily: FONT}}>
          {sub.description ?? ''}
        </Text>
      </View>
      {sub.price != null && sub.price > 0 ? (
        <Text style={{color: DS.champagne, fontSize: 11, fontWeight: '600', fontFamily: FONT}}>
          {formatRupees(sub.price)}
        </Text>
      ) : null}

      <TvPressable
        onPress={onPress}
        label={
          selected
            ? `Remove ${sub.name ?? 'service'} from your request list`
            : sent
              ? `${sub.name ?? 'This service'} is already on its way`
              : unavailable
                ? `${sub.name ?? 'This service'} is unavailable`
                : `Request ${sub.name ?? 'service'}`
        }
        restBorderColor={button.border}
        style={{
          alignSelf: 'stretch',
          height: 32,
          marginTop: 8,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: button.bg,
        }}>
        <Text
          numberOfLines={1}
          style={{
            color: button.color,
            fontSize: 10.5,
            fontWeight: '600',
            letterSpacing: 0.6,
            fontFamily: FONT,
          }}>
          {button.label}
        </Text>
      </TvPressable>
    </View>
  );
}

/* ── Right column: the live request list ── */
function RequestListPane({
  rows,
  isSubmitting,
  getDetail,
  onRemove,
  onEditNote,
  onClearAll,
  onSend,
}: {
  rows: {sub: ServiceSubCategory; categoryName?: string}[];
  isSubmitting: boolean;
  getDetail: (id: string) => string;
  onRemove: (sub: ServiceSubCategory) => void;
  onEditNote: (sub: ServiceSubCategory) => void;
  onClearAll: () => void;
  onSend: () => void;
}) {
  const hasRows = rows.length > 0;

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <Text
          style={{
            flex: 1,
            color: DS.text,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1,
            fontFamily: FONT,
          }}>
          YOUR REQUESTS{hasRows ? ` (${rows.length})` : ''}
        </Text>
        {hasRows ? (
          // Confirmed, not immediate: this link sits directly above the rows, so
          // a D-pad walking up lands on it, and one OK press would otherwise
          // wipe a list the guest just built.
          <TvPressable
            onPress={onClearAll}
            label="Clear all"
            style={{borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3}}>
            <Text
              style={{
                color: DS.champagne,
                fontSize: 10,
                textDecorationLine: 'underline',
                fontFamily: FONT,
              }}>
              Clear All
            </Text>
          </TvPressable>
        ) : null}
      </View>

      {!hasRows ? (
        <CenterState
          icon="notifications-outline"
          title="Nothing selected yet"
          message={'Press "+ REQUEST" on a service\nand it will appear here.'}
        />
      ) : (
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {rows.map(({sub, categoryName}) => {
            const note = getDetail(sub._id);
            return (
              <View
                key={sub._id}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 9,
                  marginBottom: 7,
                  borderRadius: DS.radiusSm,
                  borderWidth: 1,
                  borderColor: DS.borderSoft,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <ServiceIcon name={sub.name} description={sub.description} size={28} color={DS.champagne} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text numberOfLines={1} style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>
                      {sub.name ?? 'Service'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                      {categoryName ?? 'Service'}
                    </Text>
                  </View>
                  <TvPressable
                    onPress={() => onRemove(sub)}
                    label={`Remove ${sub.name ?? 'service'}`}
                    style={{borderRadius: 8, padding: 4}}>
                    <Icon name="close" size={14} color={DS.muted} />
                  </TvPressable>
                </View>

                {note ? (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: DS.champagne,
                      fontSize: 9.5,
                      lineHeight: 14,
                      marginTop: 6,
                      fontStyle: 'italic',
                      fontFamily: FONT,
                    }}>
                    {note}
                  </Text>
                ) : null}

                <TvPressable
                  onPress={() => onEditNote(sub)}
                  label={`${note ? 'Edit' : 'Add'} details for ${sub.name ?? 'service'}`}
                  restBorderColor={DS.borderSoft}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 26,
                    marginTop: 7,
                    paddingHorizontal: 9,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <Icon
                    name={note ? 'create-outline' : 'add'}
                    size={11}
                    color={DS.champagne}
                  />
                  <Text
                    style={{
                      color: DS.champagne,
                      fontSize: 9.5,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      marginLeft: 5,
                      fontFamily: FONT,
                    }}>
                    {note ? 'EDIT DETAILS' : 'ADD DETAILS'}
                  </Text>
                </TvPressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      {hasRows ? (
        <TvPressable
          onPress={isSubmitting ? () => {} : onSend}
          label={`Send ${rows.length} service request${rows.length === 1 ? '' : 's'}`}
          restBorderColor="#E5CFA5"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            marginTop: 10,
            borderRadius: 11,
            backgroundColor: DS.gold,
            opacity: isSubmitting ? 0.6 : 1,
          }}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={DS.text} />
          ) : (
            <>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1,
                  fontFamily: FONT,
                }}>
                SEND REQUEST
              </Text>
              <Icon name="arrow-forward" size={16} color={DS.text} style={{marginLeft: 10}} />
            </>
          )}
        </TvPressable>
      ) : null}
    </GlassPanel>
  );
}

/* ── Right column: how it works (the Figma's three steps) ── */
const STEPS = [
  {icon: 'notifications-outline', title: 'Send Request', body: 'Select any service and send request'},
  {icon: 'time-outline', title: "We'll Take Care", body: 'Our team will be notified immediately'},
  {icon: 'checkmark-circle-outline', title: 'Service Delivered', body: "We will inform you once it's done"},
];

function HowItWorks() {
  return (
    <GlassPanel style={{marginTop: DS.gap, padding: 14}}>
      <Text
        style={{
          color: DS.text,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 1,
          fontFamily: FONT,
        }}>
        HOW IT WORKS
      </Text>
      {STEPS.map(step => (
        <View key={step.title} style={{flexDirection: 'row', alignItems: 'center', marginTop: 11}}>
          <Icon name={step.icon} size={20} color={DS.champagne} />
          <View style={{flex: 1, marginLeft: 11}}>
            <Text style={{color: DS.text, fontSize: 11, fontWeight: '600', fontFamily: FONT}}>
              {step.title}
            </Text>
            <Text
              numberOfLines={2}
              style={{color: DS.muted, fontSize: 9, lineHeight: 13, marginTop: 1, fontFamily: FONT}}>
              {step.body}
            </Text>
          </View>
        </View>
      ))}
    </GlassPanel>
  );
}

export function TvServiceRequestScreen({navigation}: Props) {
  const catalog = useServiceCatalogViewModel();
  const review = useReviewRequestViewModel();
  const {getDetail, setDetail, clearAll} = useServiceRequest();
  const [pane, setPane] = useState<RightPane>({kind: 'list'});
  /** The note being edited, kept out of the cart until SAVE so CANCEL is real. */
  const [draftNote, setDraftNote] = useState('');

  /** Categories that have something to show; an empty one renders no section. */
  const sections = useMemo(
    () => catalog.categories.filter(category => (category.subCategoriesIds ?? []).length > 0),
    [catalog.categories],
  );

  /** The right column's rows, flattened out of the cart's per-category groups. */
  const rows = useMemo(
    () =>
      review.grouped.flatMap(group =>
        group.subcategories.map(sub => ({sub, categoryName: group.name})),
      ),
    [review.grouped],
  );

  /**
   * The service window, stated once under the grid. Categories with no window
   * are open round the clock — which is what the Figma's footnote claims, so it
   * is only printed when the catalog actually says so.
   */
  const availabilityNote = useMemo(() => {
    const windows = sections.map(category => serviceWindow(category)).filter(Boolean);
    if (windows.length === 0) {
      return 'Service requests are available 24 hours a day.';
    }
    const unique = Array.from(new Set(windows));
    return unique.length === 1
      ? `Service requests are taken ${unique[0]}.`
      : 'Each section shows the hours its requests are taken.';
  }, [sections]);

  const onCardPress = (sub: ServiceSubCategory, category: ServiceCategory, state: CardState) => {
    if (state === 'sent') {
      toast.info(`${sub.name ?? 'That service'} is already on its way.`);
      return;
    }
    if (state === 'unavailable') {
      const window = serviceWindow(category);
      toast.info(
        window
          ? `${category.name ?? 'These requests'} are taken ${window}.`
          : `${category.name ?? 'These requests'} are not available right now.`,
      );
      return;
    }
    catalog.toggleRequest(sub._id);
  };

  const openNote = (sub: ServiceSubCategory) => {
    setDraftNote(getDetail(sub._id));
    setPane({kind: 'note', sub});
  };

  const saveNote = () => {
    if (pane.kind === 'note') {
      setDetail(pane.sub._id, draftNote.trim());
    }
    setPane({kind: 'list'});
  };

  const onClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear your request list?',
      message: 'Every service you picked and the notes you added will be removed.',
      confirmLabel: 'Clear All',
      cancelLabel: 'Keep Them',
      destructive: true,
    });
    if (confirmed) {
      clearAll();
      setPane({kind: 'list'});
    }
  };

  /**
   * This frame is the Services TAB's root, so there is usually nothing to pop:
   * the guest arrived from the dashboard's Service Request tile, and that is
   * where the arrow has to take them. (Reached from Chat's quick-service
   * shortcut it IS a push, and then Back means back.)
   */
  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    (navigation as unknown as {navigate: (name: string) => void}).navigate('Home');
  };

  const onSend = () => {
    review
      .submit()
      .then(() => {
        toast.success('Your request has been sent to housekeeping.');
        setPane({kind: 'list'});
        navigation.navigate('ServiceBooked');
      })
      .catch(error => toast.error(getApiErrorMessage(error, 'Could not send your request.')));
  };

  // A service removed while its note pane is open has nothing left to annotate —
  // fall back to the list instead of editing a note that will never be sent.
  const rightPane =
    pane.kind === 'note' && catalog.isRequested(pane.sub._id) ? (
      <NotePane
        title={`Details · ${pane.sub.name ?? 'Service'}`}
        subtitle="Tell housekeeping anything specific"
        value={draftNote}
        onChangeText={setDraftNote}
        onDone={saveNote}
        onCancel={() => setPane({kind: 'list'})}
        presets={DETAIL_PRESETS}
        doneLabel="SAVE"
      />
    ) : (
      <RequestListPane
        rows={rows}
        isSubmitting={review.isSubmitting}
        getDetail={getDetail}
        onRemove={sub => review.remove(sub._id)}
        onEditNote={openNote}
        onClearAll={onClearAll}
        onSend={onSend}
      />
    );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the catalog ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TvBackButton onPress={onBack} size={40} />
              <View style={{marginLeft: 14}}>
                <ServiceBadge />
              </View>
              <View style={{marginLeft: 14, flex: 1}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 19,
                    fontWeight: '500',
                    letterSpacing: 1.2,
                    fontFamily: FONT,
                  }}>
                  SERVICE REQUEST
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  We are here to make your stay more comfortable
                </Text>
              </View>
              <TvPressable
                onPress={() => navigation.navigate('ServiceBooked')}
                label="Review your requests"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                <Icon name="time-outline" size={15} color={DS.text} />
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  REVIEW REQUESTS
                </Text>
              </TvPressable>
            </View>

            {catalog.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading services…
                </Text>
              </View>
            ) : catalog.error ? (
              <CenterState icon="cloud-offline-outline" title="Could not load services" message={catalog.error}>
                <TvPressable
                  onPress={() => catalog.refetch()}
                  label="Try again"
                  restBorderColor="#E5CFA5"
                  style={{
                    height: 38,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 16,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    TRY AGAIN
                  </Text>
                </TvPressable>
              </CenterState>
            ) : sections.length === 0 ? (
              <CenterState
                icon="notifications-off-outline"
                title="No services available right now"
                message="Please ask the front desk for assistance."
              />
            ) : (
              <>
                <ScrollView style={{flex: 1, marginTop: 16}} showsVerticalScrollIndicator={false}>
                  {sections.map(category => {
                    const available = isCategoryAvailable(category);
                    const window = serviceWindow(category);
                    return (
                      <View key={category._id} style={{marginBottom: 4}}>
                        <SectionTab
                          label={category.name ?? 'Requests'}
                          note={
                            available
                              ? (window ?? undefined)
                              : window
                                ? `Closed · taken ${window}`
                                : 'Not available right now'
                          }
                        />
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', columnGap: DS.gap}}>
                          {(category.subCategoriesIds ?? []).map(sub => {
                            const state: CardState = catalog.isAlreadyBooked(sub._id)
                              ? 'sent'
                              : !available
                                ? 'unavailable'
                                : catalog.isRequested(sub._id)
                                  ? 'selected'
                                  : 'request';
                            return (
                              <ServiceCard
                                key={sub._id}
                                sub={sub}
                                state={state}
                                onPress={() => onCardPress(sub, category, state)}
                              />
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* ── Footnotes ── */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    paddingVertical: 12,
                    borderRadius: DS.radius,
                    borderWidth: 1,
                    borderColor: DS.borderSoft,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}>
                  <FootNote icon="information-circle-outline">
                    Our team will respond to your request at the earliest.
                  </FootNote>
                  <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider}} />
                  <FootNote icon="time-outline">{availabilityNote}</FootNote>
                </View>
              </>
            )}
          </GlassPanel>

          {/* ── Right: the request list, then how it works and assistance ── */}
          <View style={{width: 336}}>
            {rightPane}
            <HowItWorks />
            <AssistanceCard />
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
