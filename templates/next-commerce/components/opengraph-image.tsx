import {ImageResponse} from 'next/og';
import LogoIcon from './icons/logo';
import {join} from 'path';
import {readFile} from 'fs/promises';

export type Props = {
  title?: string;
};

export default async function OpengraphImage(
  props?: Props,
): Promise<ImageResponse> {
  const {title} = {
    ...{
      title: process.env.SITE_NAME,
    },
    ...props,
  };

  const file = await readFile(join(process.cwd(), './fonts/Inter-Bold.ttf'));
  const font = Uint8Array.from(file).buffer;

  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          border: '1px solid rgb(64 64 64)',
          borderRadius: '24px',
          display: 'flex',
          height: '160px',
          justifyContent: 'center',
          width: '160px',
        }}
      >
        <LogoIcon width="64" height="58" fill="white" />
      </div>
      <p
        style={{
          color: '#fff',
          fontSize: '60px',
          fontWeight: 700,
          marginTop: '48px',
        }}
      >
        {title}
      </p>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: font,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  );
}
