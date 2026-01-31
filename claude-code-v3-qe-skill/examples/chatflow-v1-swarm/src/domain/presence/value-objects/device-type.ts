/**
 * DeviceType Value Object
 *
 * Represents the type of device a user is connecting from.
 */

export type DeviceTypeValue = 'web' | 'mobile' | 'desktop';

export class DeviceType {
  static readonly WEB = new DeviceType('web');
  static readonly MOBILE = new DeviceType('mobile');
  static readonly DESKTOP = new DeviceType('desktop');

  private constructor(private readonly value: DeviceTypeValue) {}

  static fromString(value: string): DeviceType {
    switch (value.toLowerCase()) {
      case 'web':
        return DeviceType.WEB;
      case 'mobile':
        return DeviceType.MOBILE;
      case 'desktop':
        return DeviceType.DESKTOP;
      default:
        throw new Error(`Invalid device type: ${value}`);
    }
  }

  static fromUserAgent(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();

    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      return DeviceType.MOBILE;
    }

    if (/electron|nw\.js/i.test(ua)) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.WEB;
  }

  toString(): DeviceTypeValue {
    return this.value;
  }

  equals(other: DeviceType): boolean {
    return this.value === other.value;
  }

  toJSON(): DeviceTypeValue {
    return this.value;
  }
}
