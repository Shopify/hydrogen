import {vi, describe, expect, it} from 'vitest';

import {createRef} from 'react';
import {render, screen} from '@testing-library/react';
import {ExternalVideo} from './ExternalVideo.js';
import {getExternalVideoData} from './ExternalVideo.test.helpers.js';

const testId = 'video-iframe';

describe('<ExternalVideo />', () => {
  it('renders an iframe element with sensible defaults', () => {
    const video = getExternalVideoData();
    render(<ExternalVideo data={video} data-testid={testId} />);

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toBeInTheDocument();

    expect(videoEl).toHaveAttribute('src', video.embedUrl);
    expect(videoEl).toHaveAttribute('id', video.id);
    expect(videoEl).toHaveAttribute(
      'allow',
      'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture',
    );
    expect(videoEl).toHaveAttribute('allowfullscreen');
    expect(videoEl).toHaveAttribute('frameborder', '0');
  });

  it('allows defaults to be overridden', () => {
    render(
      <ExternalVideo
        data-testid={testId}
        data={getExternalVideoData()}
        id="hello"
        allow="autoplay"
        allowFullScreen={false}
        frameBorder="1"
      />,
    );

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toHaveAttribute('id', 'hello');
    expect(videoEl).toHaveAttribute('allow', 'autoplay');
    expect(videoEl).not.toHaveAttribute('allowfullscreen');
    expect(videoEl).toHaveAttribute('frameborder', '1');
  });

  it('includes options in the iframe src when the `options` prop is provided', () => {
    const options = {
      color: 'red',
      autoplay: true,
    };
    render(
      <ExternalVideo
        data-testid={testId}
        data={getExternalVideoData({
          embedUrl: 'https://www.youtube.com/embed/a2YSgfwXc9c',
        })}
        options={options}
      />,
    );

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/a2YSgfwXc9c?color=red&autoplay=true',
    );
  });

  it('allows passthrough props', () => {
    render(
      <ExternalVideo
        data={getExternalVideoData()}
        className="fancy"
        data-testid={testId}
      />,
    );

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toHaveAttribute('class', 'fancy');
  });

  it(`throws when 'data.embedUrl' isn't passed`, () => {
    // to silence the test runner's console.error from being called
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ExternalVideo data={{id: 'hi'}} />)).toThrow(
      `<ExternalVideo/> requires the 'embedUrl' property`,
    );
    // In React 19, console.error might not be called for errors thrown during render
    // So we'll just restore the mock without checking if it was called
    errorSpy.mockRestore();
  });

  it(`handles when the embedUrl has search params already`, () => {
    const options = {
      color: 'red',
    };
    render(
      <ExternalVideo
        data-testid={testId}
        data={getExternalVideoData({
          embedUrl: 'https://www.youtube.com/embed/a2YSgfwXc9c?autoplay=true',
        })}
        options={options}
      />,
    );

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/a2YSgfwXc9c?autoplay=true&color=red',
    );
  });

  it('allows ref', () => {
    const video = getExternalVideoData();
    const ref = createRef<HTMLIFrameElement>();

    render(<ExternalVideo data={video} ref={ref} data-testid={testId} />);

    const videoEl = screen.getByTestId(testId);

    expect(videoEl).toBe(ref.current);
  });
});
