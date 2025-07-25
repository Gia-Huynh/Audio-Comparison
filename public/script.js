import { FFmpeg } from "/assets/ffmpeg/package/dist/esm/index.js";
import { fetchFile } from "/assets/util/package/dist/esm/index.js";

let ffmpeg = null;
const audioFiles = {
	mp3: 'output.mp3',
	HighLeft: 'HighLeft.flac',
	HighRight: 'HighRight.flac',
	LowLeft: 'LowLeft.flac',
	LowRight: 'LowRight.flac',
	LeftHigh_RightLow: 'LeftHigh_RightLow.flac',
	LeftLow_RightHigh: 'LeftLow_RightHigh.flac',
	Upsampled_LowBitrate: 'Upsampled_LowBitrate.flac'
};

const audioMime = {
	mp3: 'audio/mp3',
	flac: 'audio/flac',
};

const domIds = {
	mp3: 'download-mp3',
	HighLeft: 'download-high-left',
	HighRight: 'download-high-right',
	LowLeft: 'download-low-left',
	LowRight: 'download-low-right',
	LeftHigh_RightLow: 'download-low-right-high-left',
	LeftLow_RightHigh: 'download-low-left-high-right',
	Upsampled_LowBitrate: 'Upsampled_LowBitrate'
};

const createBlobUrl = (data, type) =>
URL.createObjectURL(new Blob([data.buffer], { type }));

const transcode = async () => { //{ target: { files } }
	var files = uploader.files;
	if (!files.length) return;
	const progressMessage = document.getElementById('progress-message');
	if (ffmpeg === null) {
		ffmpeg = new FFmpeg();
		ffmpeg.on("log", ({ message }) => console.log(message));
		ffmpeg.on("progress", ({ progress }) => {
			progressMessage.innerHTML = `Progress: ${(progress * 100).toFixed(2)}%`;
		});
		await ffmpeg.load({
			coreURL: "/assets/core/package/dist/esm/ffmpeg-core.js",
		});
	}

	const message = document.getElementById('message');
	const inputName = files[0].name;
	await ffmpeg.writeFile(inputName, await fetchFile(files[0]));

	message.innerHTML = 'Starting conversion to mp3 (1/7)...';
	const bitrate = document.getElementById("bitrate").value || "128";
	await ffmpeg.exec([
		"-i", inputName,
		"-b:a", `${bitrate}k`,
		"output.mp3"
	]);

	// ffmpeg -i HighQuality.flac -filter_complex "[0:a]channelsplit=channel_layout=stereo:channels=FL[left]; anullsrc=channel_layout=mono[right]; [left][right]amerge=inputs=2" HighLeft.flac
	message.innerHTML = 'Starting conversion to left-only high bitrate flac (2/7)...';
	await ffmpeg.exec([
		'-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]; anullsrc=channel_layout=mono[right]; [left][right]amerge=inputs=2',
		'HighLeft.flac'
	]);

	message.innerHTML = 'Starting conversion to right-only high bitrate flac (3/7)...';
	await ffmpeg.exec([
		'-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FR[right]; anullsrc=channel_layout=mono[left]; [left][right]amerge=inputs=2',
		'HighRight.flac'
	]);

	message.innerHTML = 'Starting conversion to left-only low bitrate flac (4/7)...';
	await ffmpeg.exec([
		'-i', 'output.mp3',
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]; anullsrc=channel_layout=mono[right]; [left][right]amerge=inputs=2',
		'LowLeft.flac'
	]);

	message.innerHTML = 'Starting conversion to right-only low bitrate flac (5/7)...';
	await ffmpeg.exec([
		'-i', 'output.mp3',
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FR[right]; anullsrc=channel_layout=mono[left]; [left][right]amerge=inputs=2',
		'LowRight.flac'
	]);
	
	message.innerHTML = 'Starting conversion Upsampled_LowBitrate.flac (7/8)...';
	
	await ffmpeg.exec([
	  '-i', 'output.mp3',
	  '-c:a', 'flac',
	  'Upsampled_LowBitrate.flac'
	]);

	message.innerHTML = 'Starting conversion to "right low bitrate" "left high bitrate" flac (7/8)...';
	/*await ffmpeg.exec([
		'-i', 'Upsampled_LowBitrate.flac', '-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FR[right]; [1:a]channelsplit=channel_layout=stereo:channels=FL[left]; [left][right]amerge=inputs=2',
		'LeftHigh_RightLow.flac'
	]);*/
	await ffmpeg.exec([
		'-i', 'Upsampled_LowBitrate.flac', '-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FR[right]; [1:a]channelsplit=channel_layout=stereo:channels=FR[left]; [left][right]amerge=inputs=2',
		'LeftHigh_RightLow.flac'
	]);
	
	message.innerHTML = 'Starting conversion to "left low bitrate" "right high bitrate" flac (8/8)...';
	/*await ffmpeg.exec([
		'-i', 'Upsampled_LowBitrate.flac', '-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]; [1:a]channelsplit=channel_layout=stereo:channels=FR[right]; [left][right]amerge=inputs=2',
		'LeftLow_RightHigh.flac'
	]);*/
	await ffmpeg.exec([
		'-i', 'Upsampled_LowBitrate.flac', '-i', inputName,
		'-filter_complex', '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]; [1:a]channelsplit=channel_layout=stereo:channels=FL[right]; [left][right]amerge=inputs=2',
		'LeftLow_RightHigh.flac'
	]);
	//'LeftHigh_RightLow.flac' 'LeftLow_RightHigh.flac'
	message.innerHTML = 'Conversion complete!';

	const setDownloadLink = (id, blobUrl) => {
		const el = document.getElementById(id);
		el.href = blobUrl;
		el.style.display = 'inline';
	};

	//const audio = document.getElementById('output-audio');

	for (const [key, filename] of Object.entries(audioFiles)) {
		const data = await ffmpeg.readFile(filename);
		const blobUrl = createBlobUrl(data, audioMime[key] || audioMime.flac);
		//if (key === 'mp3') audio.src = blobUrl;
		setDownloadLink(domIds[key], blobUrl);
	}

};
//document.getElementById('uploader').addEventListener('change', transcode);
document.getElementById('start-convert').addEventListener('click', transcode);
let leftSource;
let rightSource;
let audioCtx;
let gainNode;
async function playAudio (LeftFile = 'LowLeft.flac', RightFile = 'HighLeft.flac') {
	stopAudio();
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	let data = await ffmpeg.readFile(LeftFile);
	let leftBlobUrl = new Blob([data.buffer], { type:'audio/flac'  });
	data = await ffmpeg.readFile(RightFile);
	let rightBlobUrl = new Blob([data.buffer], { type:'audio/flac'  });

	// Decode the FLAC blobs into audio buffers
	const [leftBuffer, rightBuffer] = await Promise.all([
		audioCtx.decodeAudioData(await leftBlobUrl.arrayBuffer()),
		audioCtx.decodeAudioData(await rightBlobUrl.arrayBuffer())
	]);

	// Create source nodes
	leftSource = audioCtx.createBufferSource();
	rightSource = audioCtx.createBufferSource();

	leftSource.buffer = leftBuffer;
	rightSource.buffer = rightBuffer;

	// Pan them
	const leftPanner = audioCtx.createStereoPanner();
	leftPanner.pan.value = -1;

	const rightPanner = audioCtx.createStereoPanner();
	rightPanner.pan.value = 1;
	
	//volume slider
	gainNode = audioCtx.createGain();
	gainNode.gain.value = document.getElementById('volume-slider').value; // 10 %
	// Connect the nodes
	leftSource.connect(leftPanner).connect(gainNode).connect(audioCtx.destination);
	rightSource.connect(rightPanner).connect(gainNode).connect(audioCtx.destination);

	let decodedData = await audioCtx.decodeAudioData(await rightBlobUrl.arrayBuffer());
	let durationInSeconds = decodedData.duration;
	let startingPosition = durationInSeconds * document.getElementById('position-slider').value;
	// Start in perfect sync
	const startTime = audioCtx.currentTime + 0.1;

	leftSource.start(startTime, startingPosition);
	rightSource.start(startTime, startingPosition);
};
let leftFileSource = 'HighLeft.flac';
let rightFileSource = 'LowRight.flac';
document.getElementById('volume-slider').addEventListener('change', ()=>{if (gainNode) gainNode.gain.value = document.getElementById('volume-slider').value;});
document.getElementById('position-slider').addEventListener('change', () => playAudio (leftFileSource, rightFileSource));

document.getElementById('play-together-left-high-right-low').onclick = () => {leftFileSource = 'HighLeft.flac'; rightFileSource = 'LowRight.flac';playAudio (leftFileSource, rightFileSource);};
document.getElementById('play-together-left-low-right-high').onclick = () => {leftFileSource = 'LowLeft.flac'; rightFileSource = 'HighRight.flac';playAudio (leftFileSource, rightFileSource);};
document.getElementById('play-together-both-high').onclick = () => {leftFileSource = 'HighLeft.flac'; rightFileSource = 'HighRight.flac';playAudio (leftFileSource, rightFileSource);};
document.getElementById('play-together-both-low').onclick = () => {leftFileSource = 'LowLeft.flac'; rightFileSource = 'LowRight.flac';playAudio (leftFileSource, rightFileSource);};

function stopAudio() {
	try {
		leftSource?.stop();
		rightSource?.stop();
		audioCtx?.close();
	} catch (e) {
		console.warn("Nothing to stop:", e);
	}
};
document.getElementById('stop-playback').onclick = stopAudio;


