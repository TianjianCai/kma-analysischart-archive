import axios from "axios";
import { createWriteStream, writeFile } from "fs";
import { JSDOM } from "jsdom";

const baseUrl = "https://web.kma.go.kr";

async function getDoc(): Promise<Element | null> {
  const response = await axios.get<string>(
    `${baseUrl}/eng/weather/images/analysischart.jsp`
  );
  const html = response.data;
  const doc: Document = new JSDOM(html).window.document;
  const element = doc.querySelector("#contents li img");
  const imgUrl = element?.getAttribute("src");
  if (imgUrl) {
    const imgResponse = await axios.get(`${baseUrl}${imgUrl}`, {
      responseType: "stream",
    });
    console.log(`${baseUrl}${imgUrl}`)
    const filePaths = imgUrl.split("/");
    const writer = createWriteStream(`downloads/${filePaths[filePaths.length - 1]}`);
    imgResponse.data.pipe(writer);
    await new Promise<void>((res, rej) => {
      writer.on("finish", () => {
        res();
      });
      writer.on('error', e => {
        console.log(e);
        rej();
      })
    });
  }
  return element;
}

getDoc();
