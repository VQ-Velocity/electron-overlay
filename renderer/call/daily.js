// daily.js contains all DailyJS listeners and call joining/leaving logic.

import {
  registerJoinListener,
  registerLeaveBtnListener,
  registerCamBtnListener,
  registerMicBtnListener,
  updateCamBtn,
  updateCallControls,
  updateMicBtn,
} from "./nav.js";
import {
  addOrUpdateTile,
  removeAllTiles,
  removeTile,
  updateActiveSpeaker,
} from "./tile.js";

const playableState = "playable";

let callObject = null;
let localState = {
  audio: false,
  video: false,
};

registerJoinListener(initAndJoin);
registerLeaveBtnListener(leave);
registerCamBtnListener(toggleCamera);
registerMicBtnListener(toggleMicrophone);

async function initAndJoin(roomURL, name) {
  callObject = DailyIframe.createCallObject({
    dailyConfig: {
      experimentalChromeVideoMuteLightOff: true,
    },
  })
    .on("camera-error", handleCameraError)
    .on("joined-meeting", handleJoinedMeeting)
    .on("left-meeting", handleLeftMeeting)
    .on("error", handleError)
    .on("participant-updated", handleParticipantUpdated)
    .on("participant-joined", handleParticipantJoined)
    .on("participant-left", handleParticipantLeft)
    .on("active-speaker-change", handleActiveSpeakerChange);
  try {
    console.log("Joining " + roomURL);
    await callObject.join({ url: roomURL, userName: name });
    return true;
  } catch (e) {
    console.error(e);
  }
  return false;
}

async function leave() {
  callObject.leave();
  callObject.destroy();
  callObject = null;
}

function toggleCamera() {
  callObject.setLocalVideo(!localState.video);
}

function toggleMicrophone() {
  callObject.setLocalAudio(!localState.audio);
}

function handleCameraError(event) {
  console.error(event);
}

function handleError(event) {
  console.error(event);
}

function handleJoinedMeeting(event) {
  updateCallControls(true);
  const p = event.participants.local;
  updateLocal(p);
}

function handleLeftMeeting() {
  updateCallControls(false);
  removeAllTiles();
}

function handleParticipantUpdated(event) {
  const up = event.participant;
  if (up.session_id === callObject.participants().local.session_id) {
    updateLocal(up);
    return;
  }
  const tracks = getParticipantTracks(up);
  addOrUpdateTile(up.session_id, up.user_name, tracks.video, tracks.audio);
}

function handleParticipantJoined(event) {
  const up = event.participant;
  const tracks = getParticipantTracks(up);
  addOrUpdateTile(up.session_id, up.user_name, tracks.video, tracks.audio);
}

function getParticipantTracks(participant) {
  const vt = participant?.tracks.video;
  const at = participant?.tracks.audio;

  const videoTrack = vt.state === playableState ? vt.persistentTrack : null;
  const audioTrack = at.state === playableState ? at.persistentTrack : null;
  return {
    video: videoTrack,
    audio: audioTrack,
  };
}

function handleParticipantLeft(event) {
  const up = event.participant;
  removeTile(up.session_id);
}

function handleActiveSpeakerChange(event) {
  console.log("active speaker change", event.activeSpeaker.peerId);
  updateActiveSpeaker(event.activeSpeaker.peerId);
}

function updateLocal(p) {
  if (localState.audio != p.audio) {
    localState.audio = p.audio;
    updateMicBtn(localState.audio);
  }
  if (localState.video != p.video) {
    localState.video = p.video;
    updateCamBtn(localState.video);
  }
  const tracks = getParticipantTracks(p);
  addOrUpdateTile(p.session_id, "You!", tracks.video, tracks.audio, true);
}
