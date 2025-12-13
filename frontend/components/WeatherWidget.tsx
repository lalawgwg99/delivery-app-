'use client';

import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

interface WeatherData {
    temperature: number;
    rain: number;
    weatherCode: number;
}

// Weather code to icon and description mapping
const getWeatherInfo = (code: number) => {
    if (code === 0) return { icon: Sun, desc: '晴天', color: 'text-yellow-500' };
    if (code <= 3) return { icon: Cloud, desc: '多雲', color: 'text-gray-500' };
    if (code <= 49) return { icon: Cloud, desc: '霧', color: 'text-gray-400' };
    if (code <= 69) return { icon: CloudRain, desc: '下雨', color: 'text-blue-500' };
    if (code <= 79) return { icon: CloudSnow, desc: '下雪', color: 'text-cyan-400' };
    if (code <= 99) return { icon: CloudLightning, desc: '雷雨', color: 'text-purple-500' };
    return { icon: Wind, desc: '未知', color: 'text-gray-500' };
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Default: Kaohsiung (高雄) coordinates
                // In production, could use navigator.geolocation
                const lat = 22.63;
                const lon = 120.30;

                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,weather_code&timezone=Asia/Taipei`
                );

                if (!res.ok) throw new Error('Failed to fetch');

                const data = await res.json();

                setWeather({
                    temperature: Math.round(data.current.temperature_2m),
                    rain: data.current.rain,
                    weatherCode: data.current.weather_code,
                });
                setLoading(false);
            } catch (e) {
                console.error('Weather fetch error:', e);
                setError(true);
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl border border-blue-100 animate-pulse">
                <div className="h-12 bg-blue-100 rounded-lg"></div>
            </div>
        );
    }

    if (error || !weather) {
        return null; // Silently fail - weather is non-critical
    }

    const { icon: WeatherIcon, desc, color } = getWeatherInfo(weather.weatherCode);
    const isRainy = weather.rain > 0 || weather.weatherCode >= 51;

    return (
        <div className={`p-4 rounded-2xl border ${isRainy ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'} transition-all`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${isRainy ? 'bg-blue-100' : 'bg-amber-100'} flex items-center justify-center`}>
                        <WeatherIcon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">{weather.temperature}°</span>
                            <span className="text-sm text-gray-500">{desc}</span>
                        </div>
                        <p className="text-xs text-gray-400">高雄市</p>
                    </div>
                </div>

                {isRainy && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-blue-700">☔ 注意下雨</p>
                        <p className="text-xs text-blue-500">建議攜帶雨具</p>
                    </div>
                )}
            </div>
        </div>
    );
}
