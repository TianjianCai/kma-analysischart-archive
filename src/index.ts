import axios from "axios";
import { createWriteStream } from "fs";
import { JSDOM } from "jsdom";

const baseUrl = "https://web.kma.go.kr";

async function getPic(
  type: string = "M",
  data: string = "sfc3",
  tm?: string
): Promise<string> {
  const response = await axios.get<string>(
    `${baseUrl}/eng/weather/images/analysischart.jsp`,
    {
      params: {
        type,
        data,
        tm,
      },
    }
  );
  const html = response.data;
  const doc: Document = new JSDOM(html).window.document;
  const timeText = doc.getElementById("time_text")?.getAttribute("value");
  if (!tm) {
    tm = timeText as string;
  }
  const element = doc.querySelector("#contents li img");
  const imgUrl = element?.getAttribute("src");
  if (imgUrl) {
    console.log(`[${new Date().toISOString()}] download: ${baseUrl}${imgUrl}`)
    const imgResponse = await axios.get(`${baseUrl}${imgUrl}`, {
      responseType: "stream",
    });
    const filePath = imgUrl.split("/");
    const writer = createWriteStream(
      `downloads/${filePath[filePath.length - 1]}`
    );
    imgResponse.data.pipe(writer);
    await new Promise<void>((res, rej) => {
      writer.on("error", (e) => {
        console.log(e);
        rej();
      });
      writer.on("close", () => {
        res();
      });
    });
    return tm;
  }
  return '';
}

async function getAllPic(type: string = "M", data: string = "sfc3", timeout: number = 500) {
  let tm = await getPic();
  while (!!tm) {
    await new Promise<void>(res => {
      setTimeout(() => {
        res();
      }, timeout);
    });
    const tmFractions = tm.split('.');
    const nextDate = new Date(+tmFractions[0], +tmFractions[1] - 1, +tmFractions[2], +tmFractions[3] - 3);
    tm = `${nextDate.getFullYear()}.${nextDate.getMonth() + 1}.${nextDate.getDate()}.${nextDate.getHours()}`
    tm = await getPic(type, data, tm);
  }
}

async function getAllLoop(timeout: number = 24*60*60*1000) {
  while (true) {
    console.log(`[${new Date().toISOString()}] Start to download all pics`);
    try {
      await getAllPic();
      console.log(`[${new Date().toISOString()}] Download completed, sleep for ${timeout}ms`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] Error download all pics, sleep for ${timeout}ms`);
      console.log(e);
    }
    await new Promise<void>(res => {
      setTimeout(() => {
        res();
      }, timeout);
    })
  }
}

getAllLoop();
