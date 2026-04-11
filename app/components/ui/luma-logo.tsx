import { cn } from "@/lib/utils"
import type { SVGProps } from "react"

interface LumaLogoProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number
}

/**
 * Inline Luma mark.
 * Stroke uses `currentColor` so parent color class controls contrast:
 * default color class is `text-foreground` (black in light, cream in dark).
 */
export function LumaLogo({
  size = 72,
  className,
  ...props
}: LumaLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2000 2000"
      width={size}
      height={size}
      className={cn("text-foreground", className)}
      {...props}
    >
      <defs>
        <radialGradient
          id="luma-rg-0"
          cx="995.46"
          cy="433.05"
          fx="995.46"
          fy="433.05"
          r="262.41"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f6f6ff" />
          <stop offset=".24" stopColor="#e0e1ff" />
          <stop offset=".75" stopColor="#a9aeff" />
          <stop offset="1" stopColor="#8b92ff" />
        </radialGradient>
        <radialGradient
          id="luma-rg-1"
          cx="1006.41"
          cy="584.63"
          fx="1006.41"
          fy="584.63"
          r="262.41"
          gradientTransform="translate(2008.06 2144) rotate(179.57)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f6f6ff" />
          <stop offset=".24" stopColor="#e0e1ff" />
          <stop offset=".75" stopColor="#a9aeff" />
          <stop offset="1" stopColor="#8b92ff" />
        </radialGradient>
        <radialGradient
          id="luma-rg-2"
          cx="1564.7"
          cy="1002.45"
          fx="1564.7"
          fy="1002.45"
          r="262.45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f6f6ff" />
          <stop offset=".24" stopColor="#e0e1ff" />
          <stop offset=".75" stopColor="#a9aeff" />
          <stop offset="1" stopColor="#8b92ff" />
        </radialGradient>
        <radialGradient
          id="luma-rg-3"
          cx="820.3"
          cy="365.64"
          fx="820.3"
          fy="365.64"
          r="262.41"
          gradientTransform="translate(82.09 1831.94) rotate(-90.87)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f6f6ff" />
          <stop offset=".24" stopColor="#e0e1ff" />
          <stop offset=".75" stopColor="#a9aeff" />
          <stop offset="1" stopColor="#8b92ff" />
        </radialGradient>
        <radialGradient
          id="luma-rg-4"
          cx="995.46"
          cy="1002.45"
          fx="995.46"
          fy="1002.45"
          r="188.9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8b92ff" />
          <stop offset=".49" stopColor="#f6f6ff" />
          <stop offset=".99" stopColor="#e0e2ff" />
          <stop offset="1" stopColor="#e0e2ff" />
        </radialGradient>
        <radialGradient
          id="luma-rg-5"
          cx="1000"
          cy="1000"
          fx="1000"
          fy="1000"
          r="47.26"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset=".09" stopColor="#ffecd8" />
          <stop offset=".21" stopColor="#ffd4a7" />
          <stop offset=".33" stopColor="#ffc07d" />
          <stop offset=".46" stopColor="#ffb05a" />
          <stop offset=".59" stopColor="#ffa340" />
          <stop offset=".72" stopColor="#ff9a2d" />
          <stop offset=".86" stopColor="#ff9421" />
          <stop offset="1" stopColor="#ff931e" />
        </radialGradient>
      </defs>

      {/* Top petal */}
      <path
        fill="url(#luma-rg-0)"
        stroke="currentColor"
        strokeWidth={11}
        strokeMiterlimit={10}
        d="M995.46,190.1h0c.01,200.45,106.95,385.66,280.53,485.9h0s0,0,0,0c-173.6-100.21-387.47-100.21-561.06,0h0s0,0,0,0c173.59-100.23,280.52-285.45,280.53-485.9h0Z"
      />
      {/* Bottom petal */}
      <path
        fill="url(#luma-rg-1)"
        stroke="currentColor"
        strokeWidth={11}
        strokeMiterlimit={10}
        d="M999.11,1809.9h0c-1.52-200.44-109.84-384.85-284.18-483.77h0s0,0,0,0c174.35,98.9,388.21,97.3,561.05-4.22h0s0,0,0,0c-172.83,101.54-278.37,287.55-276.87,487.99h0Z"
      />
      {/* Right petal */}
      <path
        fill="url(#luma-rg-2)"
        stroke="currentColor"
        strokeWidth={11}
        strokeMiterlimit={10}
        d="M1807.72,1002.17h0c-200.45.13-385.6,107.17-485.73,280.81h0s0,0,0,0c100.11-173.66,99.99-387.53-.32-561.06h0s0,0,0,0c100.33,173.53,285.61,280.36,486.06,280.25h0Z"
      />
      {/* Left petal */}
      <path
        fill="url(#luma-rg-3)"
        stroke="currentColor"
        strokeWidth={11}
        strokeMiterlimit={10}
        d="M192.28,1009.86h0c200.42-3.07,383.99-112.81,481.57-287.9h0s0,0,0,0c-97.56,175.1-94.3,388.95,8.55,561h0s0,0,0,0c-102.87-172.04-289.69-276.14-490.12-273.1h0Z"
      />
      {/* Main orb */}
      <circle
        fill="url(#luma-rg-4)"
        stroke="currentColor"
        strokeWidth={11}
        strokeMiterlimit={10}
        cx="995.46"
        cy="1002.45"
        r="188.9"
      />
      {/* Core sun */}
      <circle
        fill="url(#luma-rg-5)"
        stroke="currentColor"
        strokeWidth={6}
        strokeMiterlimit={10}
        cx="1000"
        cy="1000"
        r="47.26"
      />
    </svg>
  )
}
