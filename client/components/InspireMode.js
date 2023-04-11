import React, { useEffect, useState  } from 'react';
import {
  View,
} from "react-native";
import { Button, Select, Input, Typography, Card, Image } from 'antd';
const { Title } = Typography;
 
const options = [
	{ value: '3D绘画', label: '3D绘画' },
	{ value: '油画', label: '油画' },
	{ value: '插画', label: '插画' },
	{ value: '概念画', label: '概念画' },
	{ value: '科幻', label: '科幻' },
	{ value: '古风', label: '古风' },
	{ value: '未来感', label: '未来感' },
	{ value: '高清', label: '高清' },
	{ value: '壁纸', label: '壁纸' },
	{ value: '色彩艳丽', label: '色彩艳丽' },
	{ value: '黑白', label: '黑白' },
]

const InspireMode = (props) => {
	const {localurl} = props;
	const [prompt, setPrompt] = useState({
		"one": '',
		"two": '',
		"three": ''
	});
	const [style, setStyle] = useState({
		"one": '',
		"two": '',
		"three": ''
	}) ;
	const [list, setList] = useState({
		"one": [],
		"two": [],
		"three": []
	});

	const sections = ["one", "two", "three"];

  useEffect(() => {
    console.log("Mounting...");
  },[]);

	const handleGenerate = async (index) => {
		console.log(index);
		console.log(`${prompt[index]},${style[index]}`);

		const response = await fetch(`${localurl}/inspire`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token f40e401a60e03f6ae459a36e1faa4e5c575819f5'
      },
      body: JSON.stringify({
        prompt: `${prompt[index]},${style[index]}`,
      }),
    });

    const msg = await response.json()
    console.log(msg.data)

		if(index === "one") {
			setList((olddata)=>{
				return{
				...olddata,
				one: msg.data
				}
			})
		}else if(index === "two"){
			setList((olddata)=>{
				return{
				...olddata,
				two: msg.data
				}
			})
		}else{
			setList((olddata)=>{
				return{
				...olddata,
				three: msg.data
				}
			})
		}

	};

	return (
		<>
			{sections.map((section, index) => (
				<View style={{ flexDirection: "row", margin: "2%" }}>
					<Card style={{ width: "40%" }}>
						<Title style={{ margin: 10 }} level={5}>图片{index+1}</Title>
						<Input
							size="large"
							onChange={(e) => {
								if(section === "one") {
									setPrompt((olddata)=>{
										return{
										...olddata,
										one: e.target.value
										}
									})
								}else if(section === "two"){
									setPrompt((olddata)=>{
										return{
										...olddata,
										two: e.target.value
										}
									})
								}else{
									setPrompt((olddata)=>{
										return{
										...olddata,
										three: e.target.value
										}
									})
								}
								
							}}
							style={{ width: '90%', marginTop: "10px" }}
							placeholder="文字描述"
							value={prompt[section]}
						/>
						<Select
							size="large"
							mode="multiple"
							allowClear
							style={{ width: '70%', maxWidth: '70%', marginTop: "15px", marginRight: "10px" }}
							onChange={(value) => {
								if(section === "one") {
									setStyle((olddata)=>{
										return{
										...olddata,
										one: `${value}`
										}
									})
								}else if(section === "two"){
									setStyle((olddata)=>{
										return{
										...olddata,
										two: `${value}`
										}
									})
								}else{
									setStyle((olddata)=>{
										return{
										...olddata,
										three: `${value}`
										}
									})
								}
							}}
							placeholder="风格，多选"
							options={options}
						/>
						<Button type="primary" style={{ width: '20%', marginTop: "15px" }} onClick = {() => handleGenerate(section)} >生成</Button>
					</Card>
					<Card style={{ width: "60%" }}>
						<Image.PreviewGroup>
							<Image width={"33%"} src={list[section][0]} />
							<Image width={"33%"} src={list[section][1]} />
							<Image width={"33%"} src={list[section][2]} />
						</Image.PreviewGroup>
					</Card>
				</View>
      ))}
		</>
	);
}
 
export default InspireMode;

