"use client";
import Image from "next/image";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as faceMesh from "@mediapipe/face_mesh";
// import * as faceDetection from '@tensorflow-models/face-detection';
import { ElementRef, useEffect, useRef, useState } from "react";
import { Camera } from "../utils/camera";
import { AiFillEye, AiFillCrown } from "react-icons/ai";

export default function Home() {
  const [detector, setDetector] = useState(
    null as faceLandmarksDetection.FaceLandmarksDetector | null
  );

  const firstUpdate = useRef(true);
  const [shouldBeRed, setShouldBeRed] = useState(false);
  const [numBlinks, setNumBlinks] = useState(0);
  const prevHeight = useRef(0);
  const prevFrameWasClosed = useRef(false);
  const videoRef = useRef<ElementRef<"video">>(null);
  const canvasRef = useRef<ElementRef<"canvas">>(null);
  const leftEyeCanvasRef = useRef<ElementRef<"canvas">>(null);
  const rightEyeCanvasRef = useRef<ElementRef<"canvas">>(null);
  const mainRef = useRef<ElementRef<"main">>(null);
  const [records, setRecords] = useState({
    highest_blinks: 0,
  });
  useEffect(() => {
    if (!localStorage.getItem("cf-records")) {
      localStorage.setItem("cf-records", JSON.stringify(records));
      console.log("setting to zero");
    } else {
      setRecords(JSON.parse(localStorage.getItem("cf-records")!));
    }
    (async () => {
      const camera = await Camera.setupCamera({
        targetFPS: 60,
        sizeOption: "640 X 480",
      });
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
          console.log(error);
        }

        try {
          // camera.drawCtx();
          const canvas = canvasRef.current as HTMLCanvasElement;
          const video = videoRef.current as HTMLVideoElement;
          const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          if (!faces) return;

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
            setShouldBeRed(true);
            prevFrameWasClosed.current = true;
          } else {
            setShouldBeRed(false);

            if (prevFrameWasClosed.current) {
              setNumBlinks((numBlinks) => {
                console.log("records.highest_blinks", records.highest_blinks);
                if (numBlinks > records.highest_blinks) {
                  setRecords((records) => {
                    return { ...records, highest_blinks: numBlinks + 1 };
                  });
                  console.log("setting new highest");
                }

                return numBlinks + 1;
              });
            }

            prevFrameWasClosed.current = false;
          }

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

  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }

    console.log("setting reocrds to", records);

    localStorage.setItem("cf-records", JSON.stringify(records));
  }, [records]);
  return (
    <main
      className={
        "h-screen text-white p-5 flex flex-col " +
        (shouldBeRed ? "bg-red-500" : "bg-[#264012]")
      }
      id="holding-thing"
    >
      <h1 className="text-[6vw] font-black">
        welcome to{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FF00] to-[#3AD59F]">
          caffeine 2.0
        </span>
      </h1>

      <video id="video" className="hidden" playsInline ref={videoRef}></video>

      <div className="grid grid-cols-3 gap-5 flex-grow">
        <div className="col-span-2 row-span-2 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            id="output"
            className=" h-full w-auto"
            // width={640}
            // height={480}
          />
        </div>
        <div
          id="stats"
          className="bg-slate-900 text-white rounded-2xl shadow-xl p-5 row-span-3 text-xl"
        >
          <div className="flex items-center justify-items-center justify-center">
            <AiFillEye />
            <p className="ml-2">{numBlinks}</p>
          </div>

          <div className="flex items-center justify-items-center justify-center">
            <AiFillCrown />
            <p className="ml-2">{records.highest_blinks}</p>
          </div>
        </div>
        <div>
          <canvas
            className="rounded-lg h-full w-auto"
            ref={rightEyeCanvasRef}
            height={50}
            width={50}
          />
        </div>
        <div>
          <canvas
            className="rounded-lg h-full w-auto"
            ref={leftEyeCanvasRef}
            height={50}
            width={50}
          />
        </div>
      </div>
    </main>
  );
}
