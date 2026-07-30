import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
import {
  AssistanceCard,
  CenterState,
  DS,
  FONT,
  GLASS_BLUR,
  MetaRow,
  GlassPanel,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useBookedServicesViewModel, useServiceFeedbackViewModel} from '../../viewmodels';
import {BOOKING_STATUS} from '../../constants/status';
import {formatRelativeDateTime} from '../../utils';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {ServiceIcon} from './components/ServiceIcons';
import {
  FEEDBACK_PRESETS,
  NotePane,
  ServiceBadge,
  StatusPill,
  requestRef,
  serviceStatusLabel,
  serviceTone,
  serviceWindow,
  useServiceCatalogLookup,
} from './components/TvServiceParts';
import type {BookedService} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceBooked'>;

/**
 * Review Requests (TV) — the client's Figma frame, built 1:1.
 *
 * Status tabs and the request list on the left, the selected request's detail
 * card on the right. Same `useBookedServicesViewModel` as the phone, which
 * stacks the same requests under status headings instead.
 *
 * WHAT THE FRAME ASKS FOR THAT THE BACKEND HAS NOT GOT: the mock's detail card
 * lists "Delivered At", "Delivered By", "Assigned To" and "Estimated Time".
 * `GET /v1/hotelServices/book/customer` returns none of them — a request is
 * `{_id, name, description, details, status, subCategoryId, requestedAt}` and
 * nothing more. Rather than print four dashes or invent a delivery time, the card
 * keeps the frame's row STRUCTURE and fills it with what is real: the reference
 * the guest can quote, when they asked, where the request stands, which section
 * it came from, its hours, and their own note. If the API grows those fields,
 * they drop straight into the same rows.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/** The Figma's tabs, plus Pending — a status the backend really does return. */
const FILTERS: {id: number | null; label: string}[] = [
  {id: null, label: 'All'},
  {id: BOOKING_STATUS.PENDING, label: 'Pending'},
  {id: BOOKING_STATUS.IN_PROGRESS, label: 'In Progress'},
  {id: BOOKING_STATUS.COMPLETED, label: 'Completed'},
  {id: BOOKING_STATUS.CANCEL, label: 'Cancelled'},
];

const STAR_WORD = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

/** List metrics — see the note on the row's padding. */
const ROW_GAP = 10;
const ROW_ICON = 44;

/** What happens next, per status — the frame's own promise to the guest. */
const STATUS_NOTE: Record<number, string> = {
  [BOOKING_STATUS.PENDING]: 'Housekeeping has been notified and will pick this up shortly.',
  [BOOKING_STATUS.IN_PROGRESS]: 'Our team is on it. You will be told as soon as it is done.',
  [BOOKING_STATUS.COMPLETED]: 'This request has been completed.',
  [BOOKING_STATUS.CANCEL]: 'This request was cancelled and no one is working on it.',
};

/* ── One request in the list ── */
function RequestRow({
  item,
  categoryName,
  description,
  selected,
  onPress,
}: {
  item: BookedService;
  categoryName?: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const finished = item.status === BOOKING_STATUS.COMPLETED || item.status === BOOKING_STATUS.CANCEL;

  return (
    <TvPressable
      onPress={onPress}
      label={`${item.name ?? 'Service'}, ${serviceStatusLabel(item.status)}`}
      restBorderColor={selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: DS.radius,
        backgroundColor: selected ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.055)',
        // Tuned so five requests sit in the panel at once — the metrics are what
        // decide how much of a stay's history the guest sees without scrolling.
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: ROW_GAP,
        // Finished requests step back without disappearing — the phone card does
        // the same, and the guest still has to be able to read and rate them.
        opacity: finished && !selected ? 0.72 : 1,
        ...(GLASS_BLUR ?? {}),
      }}>
      <View
        style={{
          width: ROW_ICON,
          height: ROW_ICON,
          borderRadius: ROW_ICON / 2,
          borderWidth: 1,
          borderColor: selected ? 'rgba(212,180,131,0.55)' : DS.borderSoft,
          backgroundColor: selected ? 'rgba(212,180,131,0.16)' : 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ServiceIcon
          name={item.name}
          description={description ?? item.description}
          size={26}
          color={selected ? DS.gold : DS.champagne}
        />
      </View>

      <View style={{flex: 1, marginLeft: 14, paddingRight: 10}}>
        <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontWeight: '500', fontFamily: FONT}}>
          {item.name ?? 'Service'}
        </Text>
        <Text numberOfLines={1} style={{color: DS.text2, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
          {description ?? item.description ?? categoryName ?? ''}
        </Text>
      </View>

      <View style={{width: 118, alignItems: 'flex-start'}}>
        <StatusPill status={item.status} compact />
        <Text style={{color: DS.muted, fontSize: 10, marginTop: 5, fontFamily: FONT}}>
          {formatRelativeDateTime(item.requestedAt)}
        </Text>
      </View>

      <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider, marginHorizontal: 12}} />

      {/* The frame's right-hand meta block, carrying the two things this request
          really knows: what to quote it by, and what the guest asked for. Kept to
          two lines so the row's height is set by its icon, not by this column. */}
      <View style={{width: 158}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 0.4, fontFamily: FONT}}>
            Request ID
          </Text>
          <Text
            numberOfLines={1}
            style={{flex: 1, color: DS.text2, fontSize: 10.5, textAlign: 'right', fontFamily: FONT}}>
            {requestRef(item._id)}
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
          <Icon
            name="chatbubble-ellipses-outline"
            size={11}
            color={item.details ? DS.champagne : DS.muted}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: item.details ? DS.champagne : DS.muted,
              fontSize: 10,
              marginLeft: 5,
              fontFamily: FONT,
            }}>
            {item.details || 'No note added'}
          </Text>
        </View>
      </View>

      <Icon name="chevron-forward" size={18} color={selected ? DS.gold : DS.muted} style={{marginLeft: 8}} />
    </TvPressable>
  );
}

/* ── Right column: the selected request ── */
function DetailPane({
  item,
  categoryName,
  window,
  description,
  feedback,
  onAddNote,
}: {
  item: BookedService;
  categoryName?: string;
  window?: string | null;
  description?: string;
  feedback: ReturnType<typeof useServiceFeedbackViewModel>;
  onAddNote: () => void;
}) {
  const tone = serviceTone(item.status);
  const isCompleted = item.status === BOOKING_STATUS.COMPLETED;
  const draft = feedback.draftOf(item._id);
  const sentStar = feedback.ratedStar(item._id);
  const star = sentStar ?? draft.star;

  const onSubmit = () => {
    feedback
      .submit(item._id, `${item.name ?? 'Service request'} (${requestRef(item._id)})`)
      .then(() => toast.success('Thank you — your feedback has reached the front desk.'))
      .catch(error => toast.error(getApiErrorMessage(error, 'Could not send your feedback.')));
  };

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <Text
        style={{
          color: DS.text,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 1,
          fontFamily: FONT,
        }}>
        REQUEST DETAILS
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: DS.divider,
        }}>
        <ServiceBadge size={46} name={item.name} description={description ?? item.description} />
        <View style={{flex: 1, marginLeft: 11}}>
          <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontWeight: '600', fontFamily: FONT}}>
            {item.name ?? 'Service'}
          </Text>
          <Text numberOfLines={1} style={{color: DS.muted, fontSize: 10, marginTop: 3, fontFamily: FONT}}>
            {categoryName ?? 'Service request'}
          </Text>
        </View>
      </View>

      <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
        <MetaRow icon="pricetag-outline" label="Request ID" value={requestRef(item._id)} />
        <MetaRow
          icon="calendar-outline"
          label="Requested On"
          value={formatRelativeDateTime(item.requestedAt)}
        />
        <MetaRow icon={tone.icon} label="Status">
          <StatusPill status={item.status} compact />
        </MetaRow>
        {/* The category is already the panel's subtitle — only its hours are new. */}
        {window ? <MetaRow icon="time-outline" label="Service Hours" value={window} /> : null}
        <MetaRow
          icon="chatbubble-ellipses-outline"
          label="Your Note"
          value={item.details}
          valueColor={item.details ? DS.champagne : DS.muted}
        />

        {/* What happens next — the one thing the frame's timestamps were for. It
            is dropped on a completed request: there the Status row has already
            said it, and the space belongs to the rating instead. */}
        {!isCompleted ? (
          <View
            style={{
              flexDirection: 'row',
              marginTop: 10,
              padding: 10,
              borderRadius: DS.radiusSm,
              borderWidth: 1,
              borderColor: `${tone.color}44`,
              backgroundColor: `${tone.color}14`,
            }}>
            <Icon name={tone.icon} size={14} color={tone.color} />
            <Text
              style={{flex: 1, color: DS.text2, fontSize: 10, lineHeight: 15, marginLeft: 8, fontFamily: FONT}}>
              {(item.status != null ? STATUS_NOTE[item.status] : undefined) ??
                'This request is with the front desk.'}
            </Text>
          </View>
        ) : null}

        {/* Rating — only once the work is done; there is nothing to rate before. */}
        {isCompleted ? (
          <View style={{marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: DS.divider}}>
            <Text
              style={{color: DS.text, fontSize: 12, textAlign: 'center', fontFamily: FONT}}>
              {sentStar ? 'You rated this service' : 'How was your experience?'}
            </Text>

            <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 8}}>
              {[1, 2, 3, 4, 5].map(value =>
                sentStar ? (
                  <Icon
                    key={value}
                    name={value <= sentStar ? 'star' : 'star-outline'}
                    size={22}
                    color={value <= sentStar ? DS.gold : DS.muted}
                    style={{marginHorizontal: 4}}
                  />
                ) : (
                  <TvPressable
                    key={value}
                    onPress={() => feedback.setStar(item._id, value)}
                    label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                    style={{borderRadius: 8, padding: 3, marginHorizontal: 1}}>
                    <Icon
                      name={value <= star ? 'star' : 'star-outline'}
                      size={21}
                      color={value <= star ? DS.gold : DS.muted}
                    />
                  </TvPressable>
                ),
              )}
            </View>

            {star > 0 ? (
              <Text
                style={{
                  color: sentStar ? '#8FD9A8' : DS.champagne,
                  fontSize: 11,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 6,
                  fontFamily: FONT,
                }}>
                {sentStar ? `${STAR_WORD[sentStar]} · feedback sent` : STAR_WORD[star]}
              </Text>
            ) : null}

            {!sentStar ? (
              <>
                {draft.note ? (
                  <Text
                    numberOfLines={3}
                    style={{
                      color: DS.text2,
                      fontSize: 10,
                      lineHeight: 15,
                      marginTop: 8,
                      fontStyle: 'italic',
                      fontFamily: FONT,
                    }}>
                    “{draft.note}”
                  </Text>
                ) : null}

                <TvPressable
                  onPress={onAddNote}
                  label={draft.note ? 'Edit your feedback note' : 'Add feedback, optional'}
                  restBorderColor="rgba(212,180,131,0.55)"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 38,
                    marginTop: 9,
                    borderRadius: 11,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}>
                  <Icon name="chatbubble-ellipses-outline" size={14} color={DS.champagne} />
                  <Text
                    style={{
                      color: DS.champagne,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.8,
                      marginLeft: 8,
                      fontFamily: FONT,
                    }}>
                    {draft.note ? 'EDIT FEEDBACK NOTE' : 'ADD FEEDBACK (OPTIONAL)'}
                  </Text>
                </TvPressable>

                {/* Appears only once there is a rating to send — a note with no
                    stars is not something the feedback endpoint can take. */}
                {star > 0 ? (
                  <TvPressable
                    onPress={feedback.isSubmitting ? () => {} : onSubmit}
                    label="Send feedback"
                    restBorderColor="#E5CFA5"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 42,
                      marginTop: 8,
                      borderRadius: 11,
                      backgroundColor: DS.gold,
                      opacity: feedback.isSubmitting ? 0.6 : 1,
                    }}>
                    {feedback.isSubmitting ? (
                      <ActivityIndicator size="small" color={DS.text} />
                    ) : (
                      <Text
                        style={{
                          color: DS.text,
                          fontSize: 12,
                          fontWeight: '700',
                          letterSpacing: 1,
                          fontFamily: FONT,
                        }}>
                        SEND FEEDBACK
                      </Text>
                    )}
                  </TvPressable>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </GlassPanel>
  );
}

export function TvReviewRequestsScreen({navigation}: Props) {
  const vm = useBookedServicesViewModel();
  const lookup = useServiceCatalogLookup();
  const feedback = useServiceFeedbackViewModel();
  const [filter, setFilter] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [noteFor, setNoteFor] = useState<BookedService | undefined>(undefined);

  const visible = useMemo(
    () => (filter == null ? vm.all : vm.all.filter(item => item.status === filter)),
    [vm.all, filter],
  );

  /**
   * Derived, not stored: the frame always shows one request open, and a tab that
   * filters the selected row away must fall back rather than empty the panel.
   */
  const selected = visible.find(item => item._id === selectedId) ?? visible[0];
  const hit = lookup.find(selected?.subCategoryId);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: tabs + the requests ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TvBackButton onPress={() => navigation.goBack()} size={40} />
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
                  REVIEW REQUESTS
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  Track and review all your service requests
                </Text>
              </View>
              <TvPressable
                onPress={() => vm.refetch()}
                label="Refresh your requests"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                {vm.isRefetching ? (
                  <ActivityIndicator size="small" color={DS.gold} />
                ) : (
                  <Icon name="refresh" size={15} color={DS.text} />
                )}
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  REFRESH
                </Text>
              </TvPressable>
            </View>

            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading your requests…
                </Text>
              </View>
            ) : vm.error ? (
              <CenterState icon="cloud-offline-outline" title="Could not load your requests" message={vm.error}>
                <TvPressable
                  onPress={() => vm.refetch()}
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
            ) : vm.isEmpty ? (
              <CenterState
                icon="notifications-outline"
                title="No service requests yet"
                message="Anything you ask housekeeping for will appear here, with its progress.">
                <TvPressable
                  onPress={() => navigation.navigate('Services')}
                  label="Browse services"
                  restBorderColor="#E5CFA5"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 42,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 18,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    BROWSE SERVICES
                  </Text>
                  <Icon name="arrow-forward" size={15} color={DS.text} style={{marginLeft: 8}} />
                </TvPressable>
              </CenterState>
            ) : (
              <>
                {/* ── Status tabs ── */}
                <View style={{flexDirection: 'row', marginTop: 16, marginBottom: 14, gap: 8}}>
                  {FILTERS.map(tab => {
                    const count = tab.id == null ? vm.counts.all : (vm.counts.byStatus[tab.id] ?? 0);
                    const active = tab.id === filter;
                    return (
                      <TvPressable
                        key={tab.label}
                        onPress={() => setFilter(tab.id)}
                        label={`${tab.label}, ${count} request${count === 1 ? '' : 's'}`}
                        restBorderColor={active ? '#E5CFA5' : DS.borderSoft}
                        style={{
                          height: 38,
                          justifyContent: 'center',
                          paddingHorizontal: 16,
                          borderRadius: 10,
                          backgroundColor: active ? DS.gold : 'rgba(255,255,255,0.08)',
                        }}>
                        <Text
                          style={{
                            color: active ? DS.text : DS.text2,
                            fontSize: 11.5,
                            fontWeight: active ? '700' : '500',
                            letterSpacing: 0.4,
                            fontFamily: FONT,
                          }}>
                          {tab.label} ({count})
                        </Text>
                      </TvPressable>
                    );
                  })}
                </View>

                {visible.length === 0 ? (
                  <CenterState
                    icon="funnel-outline"
                    title={`Nothing ${(FILTERS.find(f => f.id === filter)?.label ?? '').toLowerCase()}`}
                    message="Pick another tab to see your other requests."
                  />
                ) : (
                  <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                    {visible.map(item => {
                      const entry = lookup.find(item.subCategoryId);
                      return (
                        <RequestRow
                          key={item._id}
                          item={item}
                          categoryName={entry?.category.name}
                          description={entry?.sub.description}
                          selected={selected?._id === item._id}
                          onPress={() => setSelectedId(item._id)}
                        />
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </GlassPanel>

          {/* ── Right: the selected request, then assistance ── */}
          <View style={{width: 336}}>
            {noteFor ? (
              <NotePane
                title={`Feedback · ${noteFor.name ?? 'Service'}`}
                subtitle="Shared with the front desk"
                value={feedback.draftOf(noteFor._id).note}
                onChangeText={text => feedback.setNote(noteFor._id, text)}
                onDone={() => setNoteFor(undefined)}
                onCancel={() => setNoteFor(undefined)}
                presets={FEEDBACK_PRESETS}
                placeholder="Tell us how it went (optional)"
                doneLabel="SAVE"
              />
            ) : selected ? (
              <DetailPane
                item={selected}
                categoryName={hit?.category.name}
                window={serviceWindow(hit?.category)}
                description={hit?.sub.description}
                feedback={feedback}
                onAddNote={() => setNoteFor(selected)}
              />
            ) : (
              <GlassPanel style={{flex: 1, padding: 14}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 13,
                    fontWeight: '700',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  REQUEST DETAILS
                </Text>
                <CenterState
                  icon="reader-outline"
                  title="Nothing selected"
                  message="Pick a request on the left to see everything about it."
                />
              </GlassPanel>
            )}
            <AssistanceCard />
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
