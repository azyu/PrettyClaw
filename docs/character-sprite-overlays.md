# Character Sprite Overlay Guide

PrettyClaw의 캐릭터 표정 애니메이션은 `베이스 sprite + 눈/입 파츠 overlay` 방식으로 구현한다.

## 목적

- 정적 PNG/SVG 스프라이트에 눈 깜빡임 추가
- 스트리밍 중 입 애니메이션 추가
- Live2D 없이도 간단한 VN 스타일 표정 연출 제공

## 데이터 구조

캐릭터별 설정은 `CharacterConfig.spriteMeta`에 들어간다.

```ts
spriteMeta: {
  sourceWidth: 1536,
  sourceHeight: 1536,
  eyes: {
    rect: { x: 602, y: 204, width: 320, height: 120 },
    frames: [
      "/characters/parts/yuki-eyes-half-open.png",
      "/characters/parts/yuki-eyes-closed.png",
    ],
  },
  mouth: {
    rect: { x: 690, y: 318, width: 150, height: 80 },
    frames: [
      "/characters/parts/yuki-mouth-closed.png",
      "/characters/parts/yuki-mouth-half-open.png",
      "/characters/parts/yuki-mouth-open.png",
    ],
  },
}
```

## Rect 기준

- `rect`는 항상 `원본 sprite 파일의 픽셀 좌표` 기준이다.
- 화면 표시 크기나 CSS scale 기준으로 좌표를 잡지 않는다.
- `sourceWidth`, `sourceHeight`는 원본 파일 크기와 일치해야 한다.
- 렌더링 시 현재 표시 크기에 맞춰 비례 스케일링된다.

## 권장 파츠 구성

### Eyes

- 베이스 sprite는 `open` 상태를 포함한 이미지로 준비한다.
- overlay 파츠는 `half-open`, `closed`만 준비하는 것을 권장한다.
- blink 시퀀스는 `half-open -> closed -> half-open -> base(open)`로 처리한다.

### Mouth

- `closed`, `half-open`, `open` 3장을 권장한다.
- idle 상태는 `closed`
- 응답 스트리밍 중에는 `closed -> half-open -> open` 프레임을 반복한다.

## 파일 준비 규칙

- 파츠 파일은 투명 배경을 사용한다.
- 파츠 이미지는 해당 `rect`와 같은 크기이거나 같은 비율을 유지해야 한다.
- 베이스 sprite와 파츠의 정렬 기준이 어긋나지 않도록 같은 원본 위에서 잘라낸다.
- 파일 형식은 `PNG` 권장, 단순 placeholder나 벡터 작업용은 `SVG`도 가능하다.

## 파일명 규칙

권장 규칙:

- `{characterId}-eyes-half-open.png`
- `{characterId}-eyes-closed.png`
- `{characterId}-mouth-closed.png`
- `{characterId}-mouth-half-open.png`
- `{characterId}-mouth-open.png`

현재 샘플 자산은 `public/characters/parts/` 아래에 있다.

## 현재 동작 방식

- 눈:
  랜덤 간격으로 blink 타이머가 동작한다.
- 입:
  `SceneLayer`의 `isStreaming`이 `true`일 때만 애니메이션된다.
- 오디오 볼륨 분석이나 viseme 연동은 아직 하지 않는다.

## 작업 절차

1. 베이스 sprite 원본 크기를 확인한다.
2. 눈/입 영역을 원본 픽셀 기준으로 측정한다.
3. 파츠 이미지를 같은 기준으로 제작한다.
4. `src/lib/characters.ts` 또는 사용자 캐릭터 설정 JSON에 `spriteMeta`를 추가한다.
5. 화면에서 위치와 크기가 맞는지 확인한다.

## 주의사항

- 베이스 sprite에 이미 입이 강하게 그려져 있으면 overlay가 부자연스러울 수 있다.
- 캐릭터별 스타일 차이가 크면 rect만 재사용하지 말고 각 캐릭터별로 따로 측정한다.
- 실제 음성과 맞는 lip-sync가 필요하면 이후 단계에서 viseme 기반으로 확장한다.
