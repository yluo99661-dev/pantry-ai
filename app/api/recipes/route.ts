import { NextResponse } from 'next/server';
export async function POST(){return NextResponse.json({error:'当前版本使用浏览器内置食谱匹配，无需调用云端接口。'},{status:410});}
