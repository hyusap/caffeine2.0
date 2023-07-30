"use client";
import Image from "next/image";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as faceMesh from "@mediapipe/face_mesh";
// import * as faceDetection from '@tensorflow-models/face-detection';
import { ElementRef, useEffect, useRef, useState } from "react";
import { Camera } from "../utils/camera";
import { AiFillEye, AiFillCrown } from "react-icons/ai";
import { FaClock, FaMedal } from "react-icons/fa";
import { useLocalStorage } from "usehooks-ts";
import { getRandomInt } from "@/utils/misc";
import { useToast } from "@chakra-ui/react";

let test = 0;

export default function Home() {
  const [detector, setDetector] = useState(
    null as faceLandmarksDetection.FaceLandmarksDetector | null
  );

  const firstUpdate = useRef(true);
  const [shouldBeRed, setShouldBeRed] = useState(false);
  const [numBlinks, setNumBlinks] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  // const [time, setTime] = useState(0);

  const [lastBlinkTime, setLastBlinkTime] = useState(new Date().getTime());
  const [timeSinceLastBlink, setTimeSinceLastBlink] = useState(0);
  const [longestTime, setLongestTime] = useLocalStorage("cf-longest-time", "0");

  const prevHeight = useRef(0);
  // const timeSinceLastBlink = useRef(0);
  const prevFrameWasClosed = useRef(false);
  const videoRef = useRef<ElementRef<"video">>(null);
  const canvasRef = useRef<ElementRef<"canvas">>(null);
  const leftEyeCanvasRef = useRef<ElementRef<"canvas">>(null);
  const rightEyeCanvasRef = useRef<ElementRef<"canvas">>(null);
  const mainRef = useRef<ElementRef<"main">>(null);

  const toast = useToast();
  // useEffect(() => {
  //   // timer for keystroke delay
  //   let intervalId: NodeJS.Timer;
  //   intervalId = setInterval(
  //     () => setTimeSinceLastBlink(timeSinceLastBlink + 0.1),
  //     100
  //   ); // run every 100 milliseconds
  //   return () => clearInterval(intervalId);
  // }, [isRunning]);
  // useEffect(() => {

  // }, []);

  useEffect(() => {
    // if (!localStorage.getItem("cf-records")) {
    //   localStorage.setItem("cf-records", JSON.stringify(records));
    //   console.log("setting to zero");
    // } else {
    //   setRecords(JSON.parse(localStorage.getItem("cf-records")!));
    //   highest_blinks = records.highest_blinks;
    // }

    if (!localStorage.getItem("cf-longest-time")) {
      setLongestTime("0");
    }
    // timer for keystroke delay
    setInterval(() => {
      setTimeSinceLastBlink((timeSinceLastBlink) => {
        setLongestTime((longestTime: string) => {
          if (timeSinceLastBlink > Number(longestTime)) {
            return timeSinceLastBlink.toFixed(1);
          } else {
            return longestTime;
          }
        });
        return timeSinceLastBlink + 0.1;
      });

      // setTimeSinceLastBlink(timeSinceLastBlink + 0.1);
    }, 100); // run every 100 milliseconds

    (async () => {
      // const camera = await Camera.setupCamera({
      //   targetFPS: 60,
      //   sizeOption: "640 X 480",
      // });
      if (!navigator) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Browser API navigator.mediaDevices.getUserMedia not available"
        );
      }
      const video = videoRef.current as HTMLVideoElement;

      const videoConfig = {
        audio: false,
        video: {
          facingMode: "user",
          // Only setting the video to a specified size for large screen, on
          // mobile devices accept the default size.
          // width: isMobile() ? VIDEO_SIZE["360 X 270"].width : $size.width,
          // height: isMobile() ? VIDEO_SIZE["360 X 270"].height : $size.height,
          // frameRate: {
          //   ideal: targetFPS,
          // },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(videoConfig);

      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });

      video.play();

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      // Must set below two lines, otherwise video element doesn't show.
      video.width = videoWidth;
      video.height = videoHeight;

      const canvas = canvasRef.current as HTMLCanvasElement;

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      // const canvasContainer = document.querySelector(".canvas-wrapper");
      // canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

      // Because the image from camera is mirrored, need to flip horizontally.
      ctx.translate(video.videoWidth, 0);
      ctx.scale(-1, 1);
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig =
        {
          runtime: "mediapipe", // or 'tfjs'
          solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
          refineLandmarks: true,
        };
      let tempDetector = await faceLandmarksDetection.createDetector(
        model,
        detectorConfig
      );
      setDetector(tempDetector);
      async function run() {
        let faces = null;
        const video = videoRef.current as HTMLVideoElement;

        try {
          faces = await tempDetector.estimateFaces(video as HTMLVideoElement, {
            flipHorizontal: false,
          });

          if (!faces || faces.length === 0 || !faces[0]?.keypoints)
            requestAnimationFrame(run);
        } catch (error) {
          // tempDetector.dispose();
          // alert(error);
          setLastBlinkTime(0);
          console.log(error);
        }

        try {
          // camera.drawCtx();
          const canvas = canvasRef.current as HTMLCanvasElement;
          const video = videoRef.current as HTMLVideoElement;
          const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          if (!faces) {
            setLastBlinkTime(new Date().getTime());
            setTimeSinceLastBlink(() => 0);
            return;
          }
          if (faces.length < 1) {
            setLastBlinkTime(new Date().getTime());
            setTimeSinceLastBlink(() => 0);
          }

          faces.forEach((face) => {
            face.keypoints.forEach((keypoint) => {
              const { x, y } = keypoint;
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, 2 * Math.PI);
              ctx.fillStyle = "red";
              ctx.fill();
            });
          });
          const lefteyetop = faces[0].keypoints[159];
          const lefteyebottom = faces[0].keypoints[145];
          const lefteyecenter = faces[0].keypoints[33];
          const righteyetop = faces[0].keypoints[386];
          const righteyebottom = faces[0].keypoints[374];
          const righteyecenter = faces[0].keypoints[263];

          const leftEyeHeight = lefteyebottom.y - lefteyetop.y;
          const rightEyeHeight = righteyebottom.y - righteyetop.y;
          const avgHeight = (leftEyeHeight + rightEyeHeight) / 2;

          if (avgHeight < 6) {
            const audio = new Audio(`/sounds/${getRandomInt(7)}.m4a`);
            audio.play();

            setShouldBeRed(true);

            prevFrameWasClosed.current = true;
            setLastBlinkTime(new Date().getTime());
          } else {
            setShouldBeRed(false);

            if (prevFrameWasClosed.current) {
              toast({
                title: "You blinked!",
                description:
                  "Don't fall asleep. Here is a pleasant and soothing sound to keep you awake.",
                status: "warning",
                isClosable: true,
              });
              // setLastBlinkTime(new Date().getTime());
              setNumBlinks((numBlinks) => {
                // if (numBlinks > highest_blinks) {
                //   setRecords((records) => {
                //     highest_blinks += 1;
                //     return { highest_blinks: numBlinks + 1 };
                //   });
                //   console.log("setting new highest");
                // }

                return numBlinks + 1;
              });

              // within here, we know that the user blinked

              setTimeSinceLastBlink(0);
              setIsRunning(!isRunning);
            }

            prevFrameWasClosed.current = false;
          }
          // setTimeSinceLastBlink(new Date().getTime() - lastBlinkTime);
          // timeSinceLastBlink += 0.1;
          prevHeight.current = avgHeight;
          // draw line for height left eye
          ctx.beginPath();
          ctx.moveTo(lefteyetop.x, lefteyetop.y);
          ctx.lineTo(lefteyebottom.x, lefteyebottom.y);
          ctx.strokeStyle = "green";
          ctx.stroke();

          // draw line for height right eye
          ctx.beginPath();
          ctx.moveTo(righteyetop.x, righteyetop.y);
          ctx.lineTo(righteyebottom.x, righteyebottom.y);
          ctx.strokeStyle = "green";
          ctx.stroke();

          // left eye zoom
          const leftEyeCanvas = leftEyeCanvasRef.current as HTMLCanvasElement;
          const leftEyeCtx = leftEyeCanvas.getContext(
            "2d"
          ) as CanvasRenderingContext2D;
          leftEyeCtx.drawImage(
            video,
            lefteyecenter.x - 10,
            lefteyecenter.y - 25,
            50,
            50,
            0,
            0,
            50,
            50
          );

          const rightEyeCanvas = rightEyeCanvasRef.current as HTMLCanvasElement;
          const rightEyeCtx = rightEyeCanvas.getContext(
            "2d"
          ) as CanvasRenderingContext2D;
          rightEyeCtx.drawImage(
            video,
            righteyecenter.x - 40,
            righteyecenter.y - 25,
            50,
            50,
            0,
            0,
            50,
            50
          );

          requestAnimationFrame(run);
        } catch (e) {}
      }
      window.requestAnimationFrame(run);
      setDetector(tempDetector);
    })();
  }, []);

  // useEffect(() => {
  //   if (firstUpdate.current) {
  //     firstUpdate.current = false;
  //     return;
  //   }

  //   console.log("setting reocrds to", records);

  //   localStorage.setItem("cf-records", JSON.stringify(records));
  // }, [records]);
  return (
    <main
      className={
        "h-screen text-white p-5 flex flex-col " +
        (shouldBeRed ? "bg-red-500" : "bg-[#264012]")
      }
      id="holding-thing"
    >
      <div className="flex items-center">
        <h1 className="text-[6vw] font-black grow">
          welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FF00] to-[#3AD59F]">
            caffeine 2.0
          </span>
        </h1>
        <img src="/caffeine_logo.png" alt="" className='max-h-24 animate-spin	'/>
      </div>

      <video id="video" className="hidden" playsInline ref={videoRef}></video>

      <div className="grid grid-cols-3 grid-rows-3 gap-5 h-[80vh] shadow-xl">
        <div className="col-span-2 row-span-2 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            id="output"
            className="w-full h-auto"
            // width={640}
            width={"100%"}
            // height={"100%"}

            // height={480}
          />
        </div>
        {/* <div
          id="stats"
          className="bg-slate-900 text-white rounded-2xl shadow-xl p-10 row-span-3 text-xl flex flex-col"
        >
          <h2 className="text-4xl font-black ">Stats</h2>

          <div className="flex items-center justify-items-center justify-center">

          </div>
        </div> */}
        <table className="table-auto border border-gray-800 rounded-2xl font-normal overflow-hidden p-2 row-span-3">
          <thead className="bg-gray-800 text-gray-500 rounded-2xl">
            <tr>
              <th className="px-4 py-2 font-bold">Stat</th>
              <th className="px-4 py-2 font-bold">Value</th>
            </tr>
          </thead>
          <tbody className="bg-gray-700 ">
            <tr className="text-center">
              <td className="text-gray-400">
                <div className="flex justify-center items-center gap-1 h-full w-full">
                  <AiFillEye /> Blinks
                </div>
              </td>
              <td>{numBlinks}</td>
            </tr>
            <tr className="text-center">
              <td className="text-gray-400">
                <div className="flex justify-center items-center gap-1 h-full w-full">
                  <FaClock /> Time
                </div>
              </td>
              <td>{timeSinceLastBlink.toFixed(1)}</td>
            </tr>
            <tr className="text-center">
              <td className="text-gray-400">
                <div className="flex justify-center items-center gap-1 h-full w-full">
                  <FaMedal /> Best Time Today
                </div>
              </td>
              <td>{longestTime}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-center">
          <canvas
            className="rounded-lg w-full"
            ref={rightEyeCanvasRef}
            height={50}
            width={50}
            // width={"100%"}
            // height={"100%"}
          />
        </div>
        <div className="flex justify-center">
          <canvas
            className="rounded-lg w-full"
            ref={leftEyeCanvasRef}
            height={50}
            width={50}
            // width={"100%"}
            // height={"100%"}
          />
        </div>
        {/* <div>
          <canvas
            className="rounded-lg h-full "
            ref={leftEyeCanvasRef}
            height={50}
            width={50}
          />
        </div> */}
      </div>
    </main>
  );
}
