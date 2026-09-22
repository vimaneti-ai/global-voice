"use client";

import { useEffect, useState } from "react";
import {
  useIsSpeaking,
  useParticipantAttributes,
} from "@livekit/components-react";
import { Track, type RemoteParticipant } from "livekit-client";
import { NATIVE_LANG, PARTICIPANT_LANG_ATTR } from "@/lib/config";
import { getLanguageByCode } from "@/lib/languages";
import { MicOffIcon } from "./icons";

export default function ParticipantCard({
  participant,
  myLang,
}: {
  participant: RemoteParticipant;
  myLang: string;
}) {
  const [micOn, setMicOn] = useState(false);
  const isSpeaking = useIsSpeaking(participant);
  const { attributes } = useParticipantAttributes({ participant });
  const speakerLang = attributes?.[PARTICIPANT_LANG_ATTR];
  const langInfo = speakerLang ? getLanguageByCode(speakerLang) : undefined;

  const needsTranslation =
    myLang !== NATIVE_LANG && !!speakerLang && speakerLang !== myLang;

  useEffect(() => {
    const sync = () => {
      const microphone = Array.from(
        participant.audioTrackPublications.values(),
      ).find((publication) => publication.source === Track.Source.Microphone);
      setMicOn(!!microphone && !microphone.isMuted);
    };

    sync();
    participant.on("trackPublished", sync);
    participant.on("trackUnpublished", sync);
    participant.on("trackMuted", sync);
    participant.on("trackUnmuted", sync);
    return () => {
      participant.off("trackPublished", sync);
      participant.off("trackUnpublished", sync);
      participant.off("trackMuted", sync);
      participant.off("trackUnmuted", sync);
    };
  }, [participant]);

  const displayName = participant.name || participant.identity;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div
      className={`participant-card${isSpeaking && micOn ? " participant-card--speaking" : ""}`}
    >
      <div className="participant-avatar" aria-hidden>
        {initial}
      </div>
      <div className="participant-details">
        <span className="participant-name">{displayName}</span>
        {langInfo && (
          <span className="participant-language" title={langInfo.name}>
            <span aria-hidden>{langInfo.flag}</span>
            {needsTranslation
              ? `${langInfo.code.toUpperCase()} → ${myLang.toUpperCase()}`
              : langInfo.code.toUpperCase()}
          </span>
        )}
      </div>
      {!micOn && (
        <div className="participant-muted" title="Microphone off">
          <MicOffIcon />
          <span>Muted</span>
        </div>
      )}
    </div>
  );
}
